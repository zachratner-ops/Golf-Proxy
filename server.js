const express = require('express');
const https = require('https');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
  next();
});

// ── HTTP helper ───────────────────────────────────────────────────
function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers }, (r) => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => resolve({ status: r.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── State ─────────────────────────────────────────────────────────
const drafts = {};
const historyStore = {};
const OWNERS = ['Mark','Marc','Jared','Andrew','Zach','Ben','Matt'];

function getOrCreateDraft(slug) {
  if (!drafts[slug]) {
    drafts[slug] = {
      slug, name: '', status: 'setup',
      field: [], autopickList: [],
      owners: OWNERS,
      pickOrder: [], altOrder: [],
      pickSequence: [], altSequence: [],
      picks: {}, currentPickIndex: 0,
      currentPhase: 'main',
      subs: [], pot: 25 * 7,
      timerStart: null, timerDuration: 7200,
      locked: false, undoStack: [], redoStack: [],
      espnEventId: null
    };
    OWNERS.forEach(o => { drafts[slug].picks[o] = { golfers: [], alternate: null }; });
  }
  return drafts[slug];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePickSequence(order) {
  const seq = [];
  for (let r = 0; r < 4; r++) {
    const round = r % 2 === 0 ? [...order] : [...order].reverse();
    round.forEach(o => seq.push({ owner: o, round: r + 1 }));
  }
  return seq;
}

// ── ESPN golf scores ──────────────────────────────────────────────
async function fetchGolfScores(eventId) {
  try {
    const { status, body } = await httpsGet(
      'site.api.espn.com',
      `/apis/site/v2/sports/golf/pga/leaderboard?event=${eventId}`,
      { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://www.espn.com/' }
    );
    if (status !== 200) return { error: `ESPN returned ${status}` };
    const data = JSON.parse(body);
    const players = {};
    const competitors = data?.events?.[0]?.competitions?.[0]?.competitors || [];
    competitors.forEach(c => {
      const name = c.athlete?.displayName;
      const statusName = c.status?.type?.name || '';
      const cut = statusName.includes('CUT') || statusName.includes('WD') || statusName.includes('DQ');
      // Score to par
      const linescores = c.linescores || [];
      let toPar = 0;
      linescores.forEach(ls => { toPar += (ls.value || 0); });
      const displayScore = toPar === 0 ? 'E' : (toPar > 0 ? `+${toPar}` : `${toPar}`);
      if (name) players[name] = { score: toPar, display: displayScore, cut, status: statusName };
    });
    return { players, updated: new Date().toISOString() };
  } catch(e) {
    return { error: e.message };
  }
}

// ── WebSocket ─────────────────────────────────────────────────────
const clients = {};
function broadcast(slug, msg) {
  if (!clients[slug]) return;
  const str = JSON.stringify(msg);
  clients[slug].forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(str); });
}

// ── Routes ────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ ok: true, service: 'golf' }));

// Get draft state
app.get('/golf/:slug', (req, res) => {
  if (req.params.slug === 'history') return res.json(Object.values(historyStore).sort((a,b) => b.year - a.year));
  res.json(getOrCreateDraft(req.params.slug));
});

// Commissioner setup
app.post('/golf/:slug/setup', (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  const { name, field, autopickList } = req.body;
  if (name) draft.name = name;
  if (field) draft.field = field;
  if (autopickList) draft.autopickList = autopickList;
  draft.status = 'lobby';
  broadcast(req.params.slug, { type: 'state', draft });
  res.json(draft);
});

// Start draft
app.post('/golf/:slug/start', (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  if (draft.status !== 'lobby') return res.status(400).json({ error: 'Not in lobby' });
  draft.pickOrder = shuffle(OWNERS);
  draft.altOrder = shuffle(OWNERS);
  draft.pickSequence = generatePickSequence(draft.pickOrder);
  draft.altSequence = draft.altOrder.map(o => ({ owner: o, round: 5 }));
  draft.currentPickIndex = 0;
  draft.currentPhase = 'main';
  draft.status = 'drafting';
  draft.timerStart = Date.now();
  broadcast(req.params.slug, { type: 'state', draft });
  res.json(draft);
});

// Make a pick
app.post('/golf/:slug/pick', (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  if (draft.status !== 'drafting') return res.status(400).json({ error: 'Not drafting' });
  const { owner, golfer, isAutopick } = req.body;

  // Save undo state
  draft.undoStack.push({
    field: [...draft.field],
    picks: JSON.parse(JSON.stringify(draft.picks)),
    currentPickIndex: draft.currentPickIndex,
    currentPhase: draft.currentPhase,
    status: draft.status
  });
  draft.redoStack = [];

  // Remove from field
  draft.field = draft.field.filter(p => p.name !== golfer.name);

  // Assign
  if (draft.currentPhase === 'main') {
    draft.picks[owner].golfers.push({ ...golfer, isAutopick: !!isAutopick });
  } else {
    draft.picks[owner].alternate = { ...golfer, isAutopick: !!isAutopick };
  }

  // Advance index
  draft.currentPickIndex++;
  const seq = draft.currentPhase === 'main' ? draft.pickSequence : draft.altSequence;
  if (draft.currentPickIndex >= seq.length) {
    if (draft.currentPhase === 'main') {
      draft.currentPhase = 'alternate';
      draft.currentPickIndex = 0;
    } else {
      draft.status = 'complete';
      draft.locked = true;
    }
  }
  draft.timerStart = Date.now();
  broadcast(req.params.slug, { type: 'state', draft });
  res.json(draft);
});

// Undo
app.post('/golf/:slug/undo', (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  if (!draft.undoStack.length) return res.status(400).json({ error: 'Nothing to undo' });
  draft.redoStack.push({
    field: [...draft.field],
    picks: JSON.parse(JSON.stringify(draft.picks)),
    currentPickIndex: draft.currentPickIndex,
    currentPhase: draft.currentPhase,
    status: draft.status
  });
  const prev = draft.undoStack.pop();
  Object.assign(draft, prev);
  draft.timerStart = Date.now();
  broadcast(req.params.slug, { type: 'state', draft });
  res.json(draft);
});

// Redo
app.post('/golf/:slug/redo', (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  if (!draft.redoStack.length) return res.status(400).json({ error: 'Nothing to redo' });
  draft.undoStack.push({
    field: [...draft.field],
    picks: JSON.parse(JSON.stringify(draft.picks)),
    currentPickIndex: draft.currentPickIndex,
    currentPhase: draft.currentPhase,
    status: draft.status
  });
  const next = draft.redoStack.pop();
  Object.assign(draft, next);
  draft.timerStart = Date.now();
  broadcast(req.params.slug, { type: 'state', draft });
  res.json(draft);
});

// Log sub
app.post('/golf/:slug/sub', (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  const { owner, from, to, round } = req.body;
  const cost = round === 1 ? 5 : 15;
  draft.subs.push({ owner, from, to, round, cost, ts: new Date().toISOString() });
  draft.pot += cost;
  broadcast(req.params.slug, { type: 'state', draft });
  res.json(draft);
});

// Get live scores
app.get('/golf/:slug/scores', async (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  if (!draft.espnEventId) return res.status(400).json({ error: 'No ESPN event ID configured' });
  const scores = await fetchGolfScores(draft.espnEventId);
  res.json(scores);
});

// Set ESPN event ID
app.post('/golf/:slug/eventid', (req, res) => {
  const draft = getOrCreateDraft(req.params.slug);
  draft.espnEventId = req.body.eventId;
  broadcast(req.params.slug, { type: 'state', draft });
  res.json({ ok: true });
});

// History
app.get('/history', (req, res) => res.json(Object.values(historyStore).sort((a,b) => b.year - a.year)));
app.post('/history', (req, res) => {
  const entry = req.body;
  historyStore[entry.slug] = entry;
  res.json({ ok: true });
});

// ── Server + WebSocket ────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const slug = new URL(req.url, 'http://localhost').searchParams.get('slug');
  if (!slug) return ws.close();
  if (!clients[slug]) clients[slug] = new Set();
  clients[slug].add(ws);
  const draft = getOrCreateDraft(slug);
  ws.send(JSON.stringify({ type: 'state', draft }));
  ws.on('close', () => clients[slug].delete(ws));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Golf server running on port ${PORT}`));
