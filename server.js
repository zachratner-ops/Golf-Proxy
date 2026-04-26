const express = require('express');
const https = require('https');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

// ── Firebase Admin ─────────────────────────────────────────────────
let fbDb = null;
try {
  const admin = require('firebase-admin');
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: 'https://giesener-bets-default-rtdb.firebaseio.com' });
    fbDb = admin.database();
    console.log('Firebase Admin connected');
  } else {
    console.log('No FIREBASE_SERVICE_ACCOUNT — Firebase sync disabled');
  }
} catch(e) { console.log('Firebase Admin unavailable:', e.message); }

async function fbSet(path, val) { if (!fbDb) return; try { await fbDb.ref(path).set(val); } catch(e) { console.error('fbSet error:', e.message); } }
async function fbUpdate(path, val) { if (!fbDb) return; try { await fbDb.ref(path).update(val); } catch(e) { console.error('fbUpdate error:', e.message); } }
async function fbGet(path) { if (!fbDb) return null; try { const s = await fbDb.ref(path).once('value'); return s.val(); } catch(e) { console.error('fbGet error:', e.message); return null; } }
async function syncDraft(slug, draft) { await fbSet(`golf/${slug}/draft`, { ...draft, undoStack: [], redoStack: [] }); }

// ── Express ────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
  next();
});

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

// ── State ──────────────────────────────────────────────────────────
const drafts = {};
const OWNERS = ['Mark','Marc','Jared','Andrew','Zach','Ben','Matt'];

function getOrCreateDraft(slug) {
  if (!drafts[slug]) {
    drafts[slug] = {
      slug, name: '', status: 'setup',
      field: [], autopickList: [],
      owners: [...OWNERS],
      pickOrder: [], altOrder: [],
      pickSequence: [], altSequence: [],
      picks: {}, currentPickIndex: 0,
      currentPhase: 'main',
      subs: [], pot: 25 * OWNERS.length,
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
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

function generatePickSequence(order) {
  const seq = [];
  for (let r = 0; r < 4; r++) {
    const round = r%2===0 ? [...order] : [...order].reverse();
    round.forEach(o => seq.push({ owner: o, round: r+1 }));
  }
  return seq;
}

async function fetchGolfScores(eventId) {
  try {
    // Try scoreboard endpoint first (more reliable from server-side)
    // Falls back to leaderboard endpoint if scoreboard doesn't have the event
    const endpoints = [
      `/apis/site/v2/sports/golf/leaderboard?event=${eventId}`,
    ];

    let status, body;
    for (const path of endpoints) {
      const result = await httpsGet('site.web.api.espn.com', path, {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.espn.com/golf/leaderboard',
        'Origin': 'https://www.espn.com'
      });
      console.log(`[scores] ${path} -> ${result.status}`);
      if (result.status === 200) { status = result.status; body = result.body; break; }
    }
    if (status !== 200) return { error: `ESPN returned ${status}` };
    const data = JSON.parse(body);
    const players = {};
    const competitors = data?.events?.[0]?.competitions?.[0]?.competitors || [];
    competitors.forEach(c => {
      const name = c.athlete?.displayName;
      if (!name) return;
      const statusName = c.status?.type?.name || '';
      const cut = statusName.includes('CUT') || statusName.includes('WD') || statusName.includes('DQ');
      // ESPN returns score as a pre-calculated string e.g. "-12", "+5", "E"
      const scoreStr = c.score || 'E';
      let toPar = 0;
      if (scoreStr === 'E' || scoreStr === '--') {
        toPar = 0;
      } else {
        toPar = parseInt(scoreStr, 10);
        if (isNaN(toPar)) toPar = 0;
      }
      const display = toPar === 0 ? 'E' : (toPar > 0 ? `+${toPar}` : `${toPar}`);
      const safeKey = name.replace(/[^a-zA-Z0-9 _-]/g, "_"); players[safeKey] = { score: toPar, display, cut, status: statusName, espnName: name };
    });
    console.log(`[scores] Event ${eventId}: ${Object.keys(players).length} players parsed`);
    return { players, updated: new Date().toISOString() };
  } catch(e) {
    console.error('[scores] fetch error:', e.message);
    return { error: e.message };
  }
}

// ── Server-side score poller ───────────────────────────────────────
// Runs every 30 minutes. Scans Firebase for all live slugs with an
// espnEventId set, fetches ESPN scores, writes results back to Firebase.
// Clients pick up updates via their onValue(liveRef()) listener.

async function pollAllLiveSlugs() {
  if (!fbDb) return;
  try {
    const golfNode = await fbGet('golf');
    if (!golfNode) return;
    const slugs = Object.keys(golfNode).filter(k => k !== 'history');
    for (const slug of slugs) {
      const liveData = golfNode[slug]?.live;
      const draftData = golfNode[slug]?.draft;
      // Only poll if status is 'live' and an ESPN event ID is set
      if (draftData?.status !== 'live') continue;
      const eventId = liveData?.espnEventId;
      if (!eventId) continue;
      console.log(`[poller] Fetching scores for ${slug} (event ${eventId})`);
      const result = await fetchGolfScores(eventId);
      if (result.error) {
        console.error(`[poller] ESPN error for ${slug}:`, result.error);
        continue;
      }
      await fbUpdate(`golf/${slug}/live`, {
        scores: result.players,
        lastUpdated: result.updated
      });
      console.log(`[poller] Updated scores for ${slug} — ${Object.keys(result.players).length} players`);
    }
  } catch(e) {
    console.error('[poller] Error:', e.message);
  }
}

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Start polling after a short delay to let Firebase connect
setTimeout(() => {
  pollAllLiveSlugs(); // immediate first run
  setInterval(pollAllLiveSlugs, POLL_INTERVAL_MS);
  console.log(`[poller] Score poller started — interval: 30min`);
}, 5000);

// ── WebSocket ──────────────────────────────────────────────────────
const clients = {};
function broadcast(slug, msg) {
  if (!clients[slug]) return;
  const str = JSON.stringify(msg);
  clients[slug].forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(str); });
}

// ── Routes ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, service: 'golf', firebase: !!fbDb, poller: 'active' }));

app.get('/golf/:slug', (req, res) => {
  if (req.params.slug === 'history') return res.json({});
  res.json(getOrCreateDraft(req.params.slug));
});

app.post('/golf/:slug/setup', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const { name, field, autopickList, owners } = req.body;
  if (name) draft.name = name;
  if (field) draft.field = field;
  if (autopickList) draft.autopickList = autopickList;
  if (owners && owners.length >= 2) {
    draft.owners = owners;
    draft.picks = {};
    owners.forEach(o => { draft.picks[o] = { golfers: [], alternate: null }; });
  }
  draft.pot = draft.owners.length * 25;
  draft.status = 'lobby';
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json(draft);
});

app.post('/golf/:slug/start', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  if (draft.status !== 'lobby') return res.status(400).json({ error: 'Not in lobby' });
  draft.pickOrder = req.body?.pickOrder || shuffle(draft.owners);
  draft.altOrder = req.body?.altOrder || shuffle(draft.owners);
  draft.pickSequence = generatePickSequence(draft.pickOrder);
  draft.altSequence = draft.altOrder.map(o => ({ owner: o, round: 5 }));
  draft.currentPickIndex = 0;
  draft.currentPhase = 'main';
  draft.status = 'drafting';
  draft.timerStart = Date.now();
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json(draft);
});

app.post('/golf/:slug/reset', async (req, res) => {
  const slug = req.params.slug;
  delete drafts[slug];
  const fresh = getOrCreateDraft(slug);
  broadcast(slug, { type: 'state', draft: fresh });
  await syncDraft(slug, fresh);
  res.json(fresh);
});

app.post('/golf/:slug/pick', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  if (draft.status !== 'drafting') return res.status(400).json({ error: 'Not drafting' });
  const { owner, golfer, isAutopick } = req.body;
  draft.undoStack.push({ field:[...draft.field], picks:JSON.parse(JSON.stringify(draft.picks)), currentPickIndex:draft.currentPickIndex, currentPhase:draft.currentPhase, status:draft.status });
  draft.redoStack = [];
  draft.field = draft.field.filter(p => p.name !== golfer.name);
  if (draft.currentPhase === 'main') {
    draft.picks[owner].golfers.push({ ...golfer, isAutopick: !!isAutopick });
  } else {
    draft.picks[owner].alternate = { ...golfer, isAutopick: !!isAutopick };
  }
  draft.currentPickIndex++;
  const seq = draft.currentPhase === 'main' ? draft.pickSequence : draft.altSequence;
  if (draft.currentPickIndex >= seq.length) {
    if (draft.currentPhase === 'main') { draft.currentPhase = 'alternate'; draft.currentPickIndex = 0; }
    else { draft.status = 'complete'; draft.locked = true; }
  }
  draft.timerStart = Date.now();
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json(draft);
});

app.post('/golf/:slug/undo', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  if (!draft.undoStack.length) return res.status(400).json({ error: 'Nothing to undo' });
  draft.redoStack.push({ field:[...draft.field], picks:JSON.parse(JSON.stringify(draft.picks)), currentPickIndex:draft.currentPickIndex, currentPhase:draft.currentPhase, status:draft.status });
  const prev = draft.undoStack.pop();
  Object.assign(draft, prev);
  draft.timerStart = Date.now();
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json(draft);
});

app.post('/golf/:slug/redo', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  if (!draft.redoStack.length) return res.status(400).json({ error: 'Nothing to redo' });
  draft.undoStack.push({ field:[...draft.field], picks:JSON.parse(JSON.stringify(draft.picks)), currentPickIndex:draft.currentPickIndex, currentPhase:draft.currentPhase, status:draft.status });
  const next = draft.redoStack.pop();
  Object.assign(draft, next);
  draft.timerStart = Date.now();
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json(draft);
});

app.post('/golf/:slug/eventid', async (req, res) => {
  const slug = req.params.slug;
  const eventId = req.body.eventId;
  getOrCreateDraft(slug).espnEventId = eventId;
  await fbUpdate(`golf/${slug}/live`, { espnEventId: eventId });
  // Trigger an immediate poll for this slug
  console.log(`[poller] Event ID set for ${slug} — triggering immediate fetch`);
  fetchGolfScores(eventId).then(result => {
    if (!result.error) {
      fbUpdate(`golf/${slug}/live`, { scores: result.players, lastUpdated: result.updated });
      console.log(`[poller] Immediate scores written for ${slug}`);
    } else {
      console.error(`[poller] Immediate fetch error for ${slug}:`, result.error);
    }
  });
  res.json({ ok: true });
});

app.get('/golf/:slug/scores', async (req, res) => {
  const eventId = req.query.eventId || getOrCreateDraft(req.params.slug).espnEventId;
  if (!eventId) return res.status(400).json({ error: 'No ESPN event ID configured' });
  const scores = await fetchGolfScores(eventId);
  res.json(scores);
});

// Diagnostic: tests multiple ESPN endpoints from Railway's network
app.get('/golf/diag/espn', async (req, res) => {
  const eventId = req.query.eventId || '401811941';
  const paths = [
    `/apis/site/v2/sports/golf/pga/scoreboard?dates=20260101-20261231&event=${eventId}`,
    `/apis/site/v2/sports/golf/pga/leaderboard?event=${eventId}&league=pga`,
    `/apis/site/v2/sports/golf/leaderboard?event=${eventId}`,
    `/apis/site/v2/sports/golf/pga/scoreboard`,
  ];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.espn.com/golf/leaderboard',
    'Origin': 'https://www.espn.com'
  };
  const results = [];
  for (const path of paths) {
    try {
      const r = await httpsGet('site.web.api.espn.com', path, headers);
      results.push({ path, status: r.status, preview: r.body.slice(0, 200) });
    } catch(e) {
      results.push({ path, error: e.message });
    }
  }
  res.json(results);
});

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'cfabbf2a7a75831719d5b9e0938b6b4b';

async function fetchGolfOdds() {
  try {
    const { status, body } = await httpsGet('api.the-odds-api.com',
      `/v4/sports/golf_pga/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=outrights&bookmakers=draftkings,fanduel`,
      { 'Accept': 'application/json' });
    if (status === 404) return { error: 'No active golf event found — try closer to tournament week' };
    if (status === 401) return { error: 'Invalid Odds API key' };
    if (status !== 200) return { error: `Odds API returned ${status}` };
    const data = JSON.parse(body);
    if (!data.length) return { error: 'No golf odds available right now' };
    const odds = {};
    data.forEach(event => {
      (event.bookmakers||[]).forEach(bm => {
        (bm.markets||[]).forEach(market => {
          (market.outcomes||[]).forEach(outcome => {
            const name = outcome.name, price = outcome.price;
            if (!odds[name]) odds[name] = {};
            if (bm.key==='draftkings') odds[name].dk = price>0?`+${price}`:`${price}`;
            if (bm.key==='fanduel') odds[name].fd = price>0?`+${price}`:`${price}`;
          });
        });
      });
    });
    return { odds, updated: new Date().toISOString() };
  } catch(e) { return { error: e.message }; }
}

app.post('/golf/:slug/odds', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const result = await fetchGolfOdds();
  if (result.error) return res.status(502).json(result);
  const matched = [], unmatched = [];
  const availableOdds = Object.entries(result.odds).map(([name,o])=>({name,dk:o.dk,fd:o.fd})).sort((a,b)=>a.name.localeCompare(b.name));
  draft.oddsCache = result.odds;
  draft.field = draft.field.map(p => {
    const exact = result.odds[p.name];
    if (exact) { matched.push(p.name); return {...p, odds_dk:exact.dk, odds_fd:exact.fd}; }
    const lastName = p.name.split(' ').pop().toLowerCase();
    const matchKey = Object.keys(result.odds).find(k=>k.split(' ').pop().toLowerCase()===lastName);
    if (matchKey) { matched.push(p.name); return {...p, odds_dk:result.odds[matchKey].dk, odds_fd:result.odds[matchKey].fd}; }
    unmatched.push({ name: p.name });
    return p;
  });
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json({ matched: matched.length, unmatched, availableOdds, updated: result.updated });
});

app.post('/golf/:slug/odds/manual', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const { fieldName, oddsName } = req.body;
  if (!draft.oddsCache) return res.status(400).json({ error: 'No odds cache' });
  const odds = draft.oddsCache[oddsName];
  if (!odds) return res.status(404).json({ error: 'Not found: ' + oddsName });
  draft.field = draft.field.map(p => p.name===fieldName ? {...p, odds_dk:odds.dk, odds_fd:odds.fd} : p);
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json({ ok: true });
});

// ── Server + WebSocket ─────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const slug = new URL(req.url, 'http://localhost').searchParams.get('slug');
  if (!slug) return ws.close();
  if (!clients[slug]) clients[slug] = new Set();
  clients[slug].add(ws);
  ws.send(JSON.stringify({ type: 'state', draft: getOrCreateDraft(slug) }));
  ws.on('close', () => clients[slug].delete(ws));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Golf server on port ${PORT}, Firebase: ${!!fbDb}`));
