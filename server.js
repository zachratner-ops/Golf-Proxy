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

// ── GroupMe bot (f115e1cbd1afed2cc5c57a69f1)────────────────────────────────────────────────────
const GOLF_GROUPME_BOT_ID = process.env.GOLF_GROUPME_BOT_ID || '5f4343df04ccbddee0be626d14';
const GOLF_GROUPME_DRY_RUN = process.env.GOLF_GROUPME_DRY_RUN === 'true';

// GroupMe member IDs for @ mentions
const GROUPME_MEMBERS = {
  Max:    '2921868',
  Marc:   '5774512',
  Matt:   '4584150',
  Andrew: '5774515',
  Zach:   '5774513',
  Ben:    '5774514',
  Jared:  '5774445',
  Mike:   '5774511',
  Adam:   '5774510',
  Mark:   '104265229',
};

async function postDraftGroupMe(text, mentionOwners = []) {
  if (GOLF_GROUPME_DRY_RUN || !GOLF_GROUPME_BOT_ID) {
    console.log('[GroupMe DRY RUN] Would post:\n' + text);
    return;
  }
  try {
    // Build mentions attachment if any owners have known user IDs
    const attachments = [];
    if (mentionOwners.length) {
      const loci = [];
      mentionOwner: for (const owner of mentionOwners) {
        const userId = GROUPME_MEMBERS[owner];
        if (!userId) continue;
        const tag = `@${owner}`;
        let pos = text.indexOf(tag);
        if (pos === -1) continue;
        loci.push([pos, tag.length]);
      }
      if (loci.length) {
        attachments.push({
          type: 'mentions',
          user_ids: mentionOwners.map(o => GROUPME_MEMBERS[o]).filter(Boolean),
          loci
        });
      }
    }
    const payload = { bot_id: GOLF_GROUPME_BOT_ID, text };
    if (attachments.length) payload.attachments = attachments;
    const body = JSON.stringify(payload);
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, r => { r.resume(); r.on('end', resolve); });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    console.log('[GroupMe] Post sent OK');
  } catch(e) {
    console.error('[GroupMe] Post failed:', e.message);
  }
}

// ── Draft timer ────────────────────────────────────────────────────
const draftTimers = {}; // slug -> { interval, warningsFired: Set }

function startDraftTimer(slug) {
  stopDraftTimer(slug);
  const draft = drafts[slug];
  if (!draft || draft.status !== 'drafting') return;
  const warningsFired = new Set();
  draftTimers[slug] = {
    interval: setInterval(() => checkDraftTimer(slug, warningsFired), 10000),
    warningsFired
  };
}

function stopDraftTimer(slug) {
  if (draftTimers[slug]) {
    clearInterval(draftTimers[slug].interval);
    delete draftTimers[slug];
  }
}

function checkDraftTimer(slug, warningsFired) {
  const draft = drafts[slug];
  if (!draft || draft.status !== 'drafting' || !draft.timerStart) return;
  const elapsed = (Date.now() - draft.timerStart) / 1000;
  const remaining = (draft.timerDuration || 7200) - elapsed;
  const seq = draft.currentPhase === 'main' ? draft.pickSequence : draft.altSequence;
  const cur = seq?.[draft.currentPickIndex];
  if (!cur) return;
  const thresholds = [
    { secs: 3600, key: '1hr', label: '1 hour'    },
    { secs: 1800, key: '30m', label: '30 minutes' },
    { secs: 120,  key: '2m',  label: '2 minutes'  },
  ];
  for (const t of thresholds) {
    if (remaining <= t.secs && !warningsFired.has(t.key)) {
      warningsFired.add(t.key);
      postDraftGroupMe(
        `⏰ @${cur.owner} — ${t.label} left on the clock!\n🔗 gyou.in/golf-live.html?slug=${slug}`,
        [cur.owner]
      );
    }
  }
  if (remaining <= 0) stopDraftTimer(slug);
}
async function syncDraft(slug, draft) { await fbSet(`golf/${slug}/draft`, { ...draft, undoStack: [], redoStack: [] }); }

// ── Express ────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
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
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    console.error(`[getOrCreateDraft] Invalid slug rejected: "${slug.substring(0,30)}..."`);
    slug = 'invalid';
  }
  if (!drafts[slug]) {
    drafts[slug] = {
      slug, name: '', status: 'setup',
      field: [], autopickList: [],
      owners: [...OWNERS],
      pickOrder: [], altOrder: [],
      pickSequence: [], altSequence: [],
      picks: {}, currentPickIndex: 0,
      currentPhase: 'main',
      makeupPicks: {},
      subs: [], pot: 25 * OWNERS.length,
      timerStart: null, timerDuration: 7200,
      locked: false, undoStack: [], redoStack: [],
      espnEventId: null
    };
    OWNERS.forEach(o => { drafts[slug].picks[o] = { golfers: [], alternate: null }; });
  }
  return drafts[slug];
}

// Rehydrate a single slug from Firebase into memory
async function rehydrateDraft(slug) {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  const saved = await fbGet(`golf/${slug}/draft`);
  if (!saved || !saved.status || saved.status === 'setup') return null;
  drafts[slug] = {
    ...getOrCreateDraft(slug),
    ...saved,
    undoStack: [],
    redoStack: [],
  };
  // Ensure every owner in the draft has a picks entry
  const d = drafts[slug];
  if (d.owners && d.picks) {
    d.owners.forEach(o => {
      if (!d.picks[o]) d.picks[o] = { golfers: [], alternate: null };
    });
  }
  console.log(`[rehydrate] Restored ${slug} (status: ${d.status}, picks: ${Object.keys(d.picks || {}).length} owners)`);
  if (d.status === 'drafting') startDraftTimer(slug);
  return d;
}

// On startup, warm all active slugs from Firebase so a container restart
// during a live draft doesn't lose state
async function warmCache() {
  if (!fbDb) return;
  try {
    const golfNode = await fbGet('golf');
    if (!golfNode) return;
    const slugs = Object.keys(golfNode).filter(k => k !== 'history' && /^[a-zA-Z0-9_-]+$/.test(k));
    let warmed = 0;
    for (const slug of slugs) {
      const status = golfNode[slug]?.draft?.status;
      if (status && status !== 'setup') {
        await rehydrateDraft(slug);
        warmed++;
      }
    }
    console.log(`[rehydrate] Warmed ${warmed} active slug(s) from Firebase`);
  } catch(e) {
    console.error('[rehydrate] Warm cache error:', e.message);
  }
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
    const competition = data?.events?.[0]?.competitions?.[0] || {};
    const competitors = competition?.competitors || [];

    // Round number — ESPN uses different fields depending on API version
    // Try status.period first, then check competitors for their current round
    let currentRound = competition?.status?.period || null;
    if (!currentRound) {
      // Fallback: check the status type description e.g. "Round 2"
      const statusDesc = competition?.status?.type?.description || '';
      const roundMatch = statusDesc.match(/round\s*(\d)/i);
      if (roundMatch) currentRound = parseInt(roundMatch[1], 10);
    }
    if (!currentRound) {
      // Fallback: count how many linescores columns are active across competitors
      const sampleCompetitor = (competition?.competitors || [])[0];
      const linescores = sampleCompetitor?.linescores || [];
      const activeRounds = linescores.filter(l => l.displayValue && l.displayValue !== '--').length;
      if (activeRounds > 0) currentRound = activeRounds;
    }
    console.log(`[scores] Round detection: period=${competition?.status?.period} desc="${competition?.status?.type?.description}" → ${currentRound}`);

    // Cut line — ESPN exposes this on the competition object
    // Field names vary: cutLine, situation.cutLine, notes[type=cut]
    let cutLine = null;
    if (competition?.cutLine !== undefined) {
      cutLine = competition.cutLine; // numeric score to par
    } else if (competition?.situation?.cutLine !== undefined) {
      cutLine = competition.situation.cutLine;
    } else {
      // Try notes array — some ESPN responses put cut info here
      const cutNote = (competition?.notes || []).find(n => n.type === 'cut' || (n.headline||'').toLowerCase().includes('cut'));
      if (cutNote) cutLine = cutNote.headline || cutNote.text || null;
    }
    competitors.forEach(c => {
      const name = c.athlete?.displayName;
      if (!name) return;
      const statusName = c.status?.type?.name || '';
      const cut = statusName.includes('CUT') || statusName.includes('WD') || statusName.includes('DQ');

      // Total score to par — calculate from linescores for accuracy during live rounds
      // ESPN's c.score can lag; summing linescores gives the true live total
      let toPar = 0;
      const allLinescores = c.linescores || [];
      if (allLinescores.length > 0) {
        let sum = 0, hasAny = false;
        for (const ls of allLinescores) {
          const v = ls?.displayValue;
          if (!v || v === '--' || v === '') continue;
          const n = v === 'E' ? 0 : parseInt(v, 10);
          if (!isNaN(n)) { sum += n; hasAny = true; }
        }
        if (hasAny) toPar = sum;
        else {
          // Fallback to ESPN's cumulative
          const scoreStr = c.score?.displayValue || 'E';
          toPar = scoreStr === 'E' || scoreStr === '--' ? 0 : (parseInt(scoreStr, 10) || 0);
        }
      } else {
        const scoreStr = c.score?.displayValue || c.statistics?.find(s => s.name === 'scoreToPar')?.displayValue || 'E';
        toPar = scoreStr === 'E' || scoreStr === '--' ? 0 : (parseInt(scoreStr, 10) || 0);
      }
      const display = toPar === 0 ? 'E' : (toPar > 0 ? `+${toPar}` : `${toPar}`);

      // This round's score — use currentRound index directly (1-indexed → 0-indexed)
      let roundScore = null;
      const linescores = c.linescores || [];
      if (linescores.length > 0 && currentRound) {
        const idx = currentRound - 1;
        const val = linescores[idx]?.displayValue;
        if (val && val !== '--' && val !== '') {
          roundScore = val === 'E' ? 0 : parseInt(val, 10);
          if (isNaN(roundScore)) roundScore = null;
        }
        // Fallback to previous round if current has no data yet (player hasn't started)
        if (roundScore === null && idx > 0) {
          const prevVal = linescores[idx - 1]?.displayValue;
          if (prevVal && prevVal !== '--' && prevVal !== '') {
            roundScore = prevVal === 'E' ? 0 : parseInt(prevVal, 10);
            if (isNaN(roundScore)) roundScore = null;
          }
        }
      }

      // Position (leaderboard rank)
      const position = c.status?.position?.displayName || c.status?.position?.abbreviation || null;

      // Thru / current hole — ESPN uses status.displayValue e.g. "F", "Thru 14", "*3"
      // For players who haven't teed off, displayValue often contains the tee time e.g. "10:30 AM"
      const thru = c.status?.displayValue || null;
      // Tee time — present when player hasn't started their round yet
      const teeTime = c.status?.teeTime || null;

      const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const safeKey = normalizedName.replace(/[^a-zA-Z0-9 _-]/g, '_');
      players[safeKey] = { score: toPar, display, cut, status: statusName, espnName: name, roundScore, thru, teeTime, position };
    });
    console.log(`[scores] Event ${eventId}: ${Object.keys(players).length} players parsed, round ${currentRound}, cutLine ${cutLine}`);
    return { players, updated: new Date().toISOString(), round: currentRound, cutLine };
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
    const slugs = Object.keys(golfNode).filter(k => k !== 'history' && /^[a-zA-Z0-9_-]+$/.test(k));
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
      // Remove any manually overridden players so ESPN doesn't clobber them
      const manualOverrides = liveData?.manualOverrides || {};
      Object.keys(manualOverrides).forEach(key => delete result.players[key]);
      // Write individual score keys to preserve override entries in Firebase
      const scoreUpdates = { lastUpdated: result.updated };
      Object.entries(result.players).forEach(([k,v]) => { scoreUpdates[`scores/${k}`] = v; });
      // Auto-update round from ESPN if available
      if (result.round && result.round !== liveData?.round) {
        scoreUpdates['round'] = result.round;
        console.log(`[poller] Auto-updated round to ${result.round} for ${slug}`);
      }
      // Write cut line if available
      if (result.cutLine !== null && result.cutLine !== undefined) {
        scoreUpdates['cutLine'] = result.cutLine;
      }
      await fbUpdate(`golf/${slug}/live`, scoreUpdates);

      // Append chart snapshot to Firebase so history survives page reloads
      // Build owner team scores from current picks + new scores
      const draftPicks = draftData?.picks || {};
      const draftOwners = draftData?.owners || [];
      const allSubs = Array.isArray(liveData?.subs) ? liveData.subs : Object.values(liveData?.subs || {});
      const snapshotScores = {};
      draftOwners.forEach(owner => {
        const picks = draftPicks[owner] || { golfers: [], alternate: null };
        const ownerSub = allSubs.find(s => s.owner === owner);
        let golfers = picks.golfers.map(g => ({ ...g }));
        if (ownerSub) {
          golfers = golfers.filter(g => g.name !== ownerSub.from).concat([{ name: ownerSub.to }]);
        }
        const active = golfers.map(g => {
          const normName = g.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'_');
          const s = result.players[normName] || result.players[Object.keys(result.players).find(k => k.split(' ').pop().toLowerCase() === normName.split(' ').pop().toLowerCase())] || null;
          return s && !s.cut ? s.score : null;
        }).filter(s => s !== null).sort((a,b) => a - b);
        snapshotScores[owner] = active.length >= 3 ? active.slice(0, 3).reduce((a,b) => a+b, 0) : null;
      });
      const snapshotKey = `snap_${Date.now()}`;
      await fbSet(`golf/${slug}/live/scoreHistory/${snapshotKey}`, { ts: result.updated, scores: snapshotScores });
      // Keep only last 1000 snapshots (~80hrs at 5min intervals — covers full tournament)
      const historyNode = await fbGet(`golf/${slug}/live/scoreHistory`);
      if (historyNode) {
        const keys = Object.keys(historyNode).sort();
        if (keys.length > 1000) {
          const toDelete = keys.slice(0, keys.length - 1000);
          for (const k of toDelete) await fbSet(`golf/${slug}/live/scoreHistory/${k}`, null);
        }
      }
      console.log(`[poller] Updated scores for ${slug} — ${Object.keys(result.players).length} players, snapshot written`);
    }
  } catch(e) {
    console.error('[poller] Error:', e.message);
  }
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function isTournamentHours() {
  const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }), 10);
  return hour >= 7 && hour < 19; // 7am-7pm ET
}

// Start polling and warm cache after Firebase connects
setTimeout(async () => {
  await warmCache();
  await pollAllLiveSlugs();
  setInterval(() => {
    if (isTournamentHours()) {
      pollAllLiveSlugs();
    } else {
      console.log('[poller] Outside tournament hours (7am-7pm ET) — skipping');
    }
  }, POLL_INTERVAL_MS);
  console.log(`[poller] Score poller started — interval: 5min, active 7am-7pm ET`);
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

app.get('/golf/:slug', async (req, res) => {
  if (req.params.slug === 'history') return res.json({});
  const slug = req.params.slug;
  // Guard against malformed slugs
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return res.status(400).json({ error: 'Invalid slug' });
  if (!drafts[slug]) await rehydrateDraft(slug);
  res.json(getOrCreateDraft(slug));
});

app.post('/golf/:slug/setup', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const { name, field, autopickList, owners, espnEventId } = req.body;
  if (name) draft.name = name;
  if (field) draft.field = field;
  if (autopickList) draft.autopickList = autopickList;
  if (espnEventId) draft.espnEventId = espnEventId;
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
  if (req.body?.timerDuration) draft.timerDuration = req.body.timerDuration;
  draft.pickSequence = generatePickSequence(draft.pickOrder);
  draft.altSequence = draft.altOrder.map(o => ({ owner: o, round: 5 }));
  draft.currentPickIndex = 0;
  draft.currentPhase = 'main';
  draft.status = 'drafting';
  draft.timerStart = Date.now();
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  startDraftTimer(slug);
  const firstOwner = draft.pickSequence?.[0]?.owner || '';
  postDraftGroupMe(
    `🏌️ Draft started! ${draft.name || slug}\n\n@${firstOwner} is on the clock first.\n\n🔗 gyou.in/golf-live.html?slug=${slug}`,
    firstOwner ? [firstOwner] : []
  ).catch(()=>{});
  res.json(draft);
});

app.post('/golf/:slug/reset', async (req, res) => {
  const slug = req.params.slug;
  stopDraftTimer(slug);
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
  draft.undoStack.push({
    field: [...draft.field],
    picks: JSON.parse(JSON.stringify(draft.picks)),
    makeupPicks: JSON.parse(JSON.stringify(draft.makeupPicks || {})),
    currentPickIndex: draft.currentPickIndex,
    currentPhase: draft.currentPhase,
    status: draft.status
  });
  draft.redoStack = [];
  draft.field = draft.field.filter(p => p.name !== golfer.name);
  // Ensure owner has a picks entry (defensive — should always exist)
  if (!draft.picks[owner]) draft.picks[owner] = { golfers: [], alternate: null };
  const mainSeq = draft.pickSequence || [];
  const altSeq = draft.altSequence || [];
  let pickNumber;
  if (draft.currentPhase === 'main') {
    pickNumber = draft.currentPickIndex + 1;
    draft.picks[owner].golfers.push({ ...golfer, isAutopick: !!isAutopick, pickNumber });
  } else {
    pickNumber = mainSeq.length + draft.currentPickIndex + 1;
    draft.picks[owner].alternate = { ...golfer, isAutopick: !!isAutopick, pickNumber };
  }
  draft.currentPickIndex++;
  const seq = draft.currentPhase === 'main' ? draft.pickSequence : draft.altSequence;
  const isDraftComplete = draft.currentPickIndex >= seq.length && draft.currentPhase === 'alternate';
  if (draft.currentPickIndex >= seq.length) {
    if (draft.currentPhase === 'main') { draft.currentPhase = 'alternate'; draft.currentPickIndex = 0; }
    else { draft.status = 'complete'; draft.locked = true; }
  }
  draft.timerStart = Date.now();
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);

  // GroupMe pick notification
  const numOwners = draft.owners?.length || 1;
  const roundNum = Math.ceil(pickNumber / numOwners);
  const isAlt = pickNumber > mainSeq.length;
  const roundLabel = isAlt ? 'Alt Round' : `Round ${roundNum}`;
  // GroupMe pick notification — skip for autopicks (placeholder assigns handle their own message)
  if (!isAutopick) {
    const nextSeq = draft.currentPhase === 'main' ? draft.pickSequence : draft.altSequence;
    const nextOwner = nextSeq?.[draft.currentPickIndex]?.owner;
    const onClockLine = nextOwner ? `⏱ @${nextOwner} you're on the clock` : '';
    postDraftGroupMe(
      `⛳ Pick ${pickNumber} — ${roundLabel}\n\n🏌️ ${owner} takes ${golfer.name}${onClockLine ? '\n' + onClockLine : ''}`,
      nextOwner ? [nextOwner] : []
    ).catch(()=>{});
  }

  // Reset timer warnings for new pick owner, or stop if draft complete
  if (isDraftComplete) {
    stopDraftTimer(slug);
    postDraftGroupMe(`✅ Draft complete!\nAll picks are in. Good luck everyone 🏆\n🔗 gyou.in/golf-live.html?slug=${slug}`).catch(()=>{});
  } else if (draftTimers[slug]) {
    draftTimers[slug].warningsFired.clear();
  }

  res.json(draft);
});

app.post('/golf/:slug/undo', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  if (!draft.undoStack.length) return res.status(400).json({ error: 'Nothing to undo' });
  draft.redoStack.push({
    field: [...draft.field],
    picks: JSON.parse(JSON.stringify(draft.picks)),
    makeupPicks: JSON.parse(JSON.stringify(draft.makeupPicks || {})),
    currentPickIndex: draft.currentPickIndex,
    currentPhase: draft.currentPhase,
    status: draft.status
  });
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
  draft.undoStack.push({
    field: [...draft.field],
    picks: JSON.parse(JSON.stringify(draft.picks)),
    makeupPicks: JSON.parse(JSON.stringify(draft.makeupPicks || {})),
    currentPickIndex: draft.currentPickIndex,
    currentPhase: draft.currentPhase,
    status: draft.status
  });
  const next = draft.redoStack.pop();
  Object.assign(draft, next);
  draft.timerStart = Date.now();
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json(draft);
});

app.post('/golf/:slug/makeup-set', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const { owner, slotIndex } = req.body;
  if (!draft.makeupPicks) draft.makeupPicks = {};
  draft.makeupPicks[owner] = slotIndex;
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);

  // GroupMe — placeholder assigned, next owner on the clock
  const mainSeq = draft.pickSequence || [];
  const curSeq = draft.currentPhase === 'main' ? mainSeq : draft.altSequence || [];
  const pickNumber = draft.currentPhase === 'main'
    ? draft.currentPickIndex
    : mainSeq.length + draft.currentPickIndex;
  const numOwners = draft.owners?.length || 1;
  const roundNum = Math.ceil(pickNumber / numOwners);
  const isAlt = draft.currentPhase === 'alternate';
  const roundLabel = isAlt ? 'Alt Round' : `Round ${roundNum}`;
  const nextOwner = curSeq?.[draft.currentPickIndex]?.owner;
  const onClockLine = nextOwner ? `⏱ @${nextOwner} you're on the clock` : '';
  // Get the placeholder name just assigned (last golfer added to owner's picks)
  const placeholderGolfer = draft.picks[owner]?.golfers?.[slotIndex]?.name || 'a placeholder';
  postDraftGroupMe(
    `⛳ Pick ${pickNumber} — ${roundLabel}\n\n🏌️ ${owner} assigned a placeholder: ${placeholderGolfer}${onClockLine ? '\n' + onClockLine : ''}`,
    nextOwner ? [nextOwner] : []
  ).catch(()=>{});

  res.json(draft);
});

app.post('/golf/:slug/makeup-clear', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const { owner, realPickName, placeholderName } = req.body;
  if (!draft.makeupPicks) draft.makeupPicks = {};
  const slotIndex = draft.makeupPicks[owner];
  if (slotIndex !== undefined && slotIndex !== null) {
    draft.picks[owner].golfers[slotIndex] = { name: realPickName };
    draft.field = draft.field.filter(p => p.name !== realPickName);
    if (placeholderName) draft.field.push({ name: placeholderName });
    delete draft.makeupPicks[owner];
  }
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);

  // GroupMe — real pick made
  postDraftGroupMe(`🏌️ ${owner} makes their pick: ${realPickName} replacing ${placeholderName || 'placeholder'}`).catch(()=>{});

  res.json(draft);
});

app.post('/golf/:slug/field-remove', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const { name } = req.body;
  draft.field = draft.field.filter(p => p.name !== name);
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json({ ok: true });
});


app.post('/golf/:slug/scores/override', async (req, res) => {
  const slug = req.params.slug;
  const { playerName, score, cut } = req.body;
  if (!playerName) return res.status(400).json({ error: 'playerName required' });
  const safeKey = playerName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'_');
  const toPar = parseInt(score, 10) || 0;
  const display = toPar === 0 ? 'E' : (toPar > 0 ? `+${toPar}` : `${toPar}`);
  // Write score and register in manualOverrides so poller never clobbers it
  await fbUpdate(`golf/${slug}/live/scores/${safeKey}`, {
    score: toPar, display, cut: !!cut, status: cut ? 'STATUS_CUT' : 'STATUS_IN_PROGRESS', espnName: playerName, manual: true
  });
  await fbUpdate(`golf/${slug}/live/manualOverrides`, { [safeKey]: playerName });
  res.json({ ok: true, key: safeKey, score: toPar, display });
});

app.post('/golf/:slug/scores/override-clear', async (req, res) => {
  const slug = req.params.slug;
  const { safeKey } = req.body;
  if (!safeKey) return res.status(400).json({ error: 'safeKey required' });
  // Remove from manualOverrides — ESPN will overwrite on next poll
  await fbUpdate(`golf/${slug}/live/manualOverrides`, { [safeKey]: null });
  res.json({ ok: true });
});


app.post('/golf/:slug/eventid', async (req, res) => {
  const slug = req.params.slug;
  const eventId = req.body.eventId;
  getOrCreateDraft(slug).espnEventId = eventId;
  await fbUpdate(`golf/${slug}/live`, { espnEventId: eventId });
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

// Dump raw first competitor object so we can see ESPN's score field structure
app.get('/golf/diag/competitor', async (req, res) => {
  const eventId = req.query.eventId || '401811941';
  try {
    const { status, body } = await httpsGet('site.web.api.espn.com',
      `/apis/site/v2/sports/golf/leaderboard?event=${eventId}`,
      {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.espn.com/golf/leaderboard',
        'Origin': 'https://www.espn.com'
      });
    const data = JSON.parse(body);
    const competitors = data?.events?.[0]?.competitions?.[0]?.competitors || [];
    // Return first 3 competitors raw so we can see the score field location
    res.json({ count: competitors.length, sample: competitors.slice(0, 3) });
  } catch(e) {
    res.json({ error: e.message });
  }
});

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
    // Step 1: Discover active golf sport keys — free call, doesn't count against quota
    const { status: sStatus, body: sBody } = await httpsGet('api.the-odds-api.com',
      `/v4/sports?apiKey=${ODDS_API_KEY}&all=true`,
      { 'Accept': 'application/json' });
    if (sStatus === 401) return { error: 'Invalid Odds API key' };
    if (sStatus !== 200) return { error: `Odds API /sports returned ${sStatus}` };

    const allSports = JSON.parse(sBody);
    const golfSports = allSports.filter(s => s.group === 'Golf' && s.has_outrights && s.active);
    if (!golfSports.length) return { error: 'No active golf events found in Odds API' };
    console.log(`[odds] Active golf keys: ${golfSports.map(s => s.key).join(', ')}`);

    // Step 2: Fetch win odds (outrights) — DK + FD
    const odds = {};
    let foundEvent = null;
    let foundEventId = null;
    for (const sport of golfSports) {
      const { status, body } = await httpsGet('api.the-odds-api.com',
        `/v4/sports/${sport.key}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=outrights&bookmakers=draftkings,fanduel&oddsFormat=american`,
        { 'Accept': 'application/json' });
      if (status === 401) return { error: 'Invalid Odds API key' };
      if (status !== 200) continue;
      const data = JSON.parse(body);
      if (!data.length) continue;
      foundEvent = sport.title;
      foundEventId = data[0]?.id || null;
      // Log which bookmakers are actually returning data
      const booksFound = new Set();
      data.forEach(event => (event.bookmakers || []).forEach(bm => booksFound.add(bm.key)));
      console.log(`[odds] Bookmakers available for ${sport.title}: ${[...booksFound].join(', ')}`);
      data.forEach(event => {
        (event.bookmakers || []).forEach(bm => {
          (bm.markets || []).forEach(market => {
            if (market.key !== 'outrights') return;
            (market.outcomes || []).forEach(outcome => {
              const name = outcome.name, price = outcome.price;
              if (!odds[name]) odds[name] = {};
              const fmt = p => p > 0 ? `+${p}` : `${p}`;
              if (bm.key === 'draftkings') odds[name].dk = fmt(price);
              if (bm.key === 'fanduel') odds[name].fd = fmt(price);
            });
          });
        });
      });
      if (Object.keys(odds).length) break;
    }

    if (!Object.keys(odds).length) return { error: 'No golf odds available right now' };
    console.log(`[odds] Fetched ${Object.keys(odds).length} win odds for: ${foundEvent}`);

    // Step 3: Try to fetch top10 + make cut from event-level endpoint (may not be available)
    if (foundEventId) {
      const sportKey = golfSports.find(s => s.title === foundEvent)?.key;
      if (sportKey) {
        const { status: eStatus, body: eBody } = await httpsGet('api.the-odds-api.com',
          `/v4/sports/${sportKey}/events/${foundEventId}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=player_top_10,player_make_cut&bookmakers=draftkings,fanduel&oddsFormat=american`,
          { 'Accept': 'application/json' });
        if (eStatus === 200) {
          try {
            const eData = JSON.parse(eBody);
            let top10Count = 0, cutCount = 0;
            (eData.bookmakers || []).forEach(bm => {
              if (bm.key !== 'draftkings' && bm.key !== 'fanduel') return;
              const isFD = bm.key === 'fanduel';
              (bm.markets || []).forEach(market => {
                (market.outcomes || []).forEach(outcome => {
                  const name = outcome.name, price = outcome.price;
                  if (outcome.description && outcome.description.toLowerCase() === 'no') return;
                  if (!odds[name]) odds[name] = {};
                  const fmt = p => p > 0 ? `+${p}` : `${p}`;
                  if (!isFD) {
                    if (market.key === 'player_top_10') { odds[name].dk_top10 = fmt(price); top10Count++; }
                    if (market.key === 'player_make_cut') { odds[name].dk_cut = fmt(price); cutCount++; }
                  }
                });
              });
            });
            console.log(`[odds] Event-level markets: ${top10Count} top10, ${cutCount} cut lines`);
          } catch(e) { console.log('[odds] Event-level parse error:', e.message); }
        } else {
          console.log(`[odds] Event-level endpoint returned ${eStatus} — top10/cut not available`);
        }
      }
    }

    return { odds, updated: new Date().toISOString(), event: foundEvent };
  } catch(e) { return { error: e.message }; }
}

app.post('/golf/:slug/odds', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const result = await fetchGolfOdds();
  if (result.error) return res.status(502).json(result);
  const matched = [], unmatched = [];
  // Sanitize keys for Firebase
  const safeOdds = {};
  Object.entries(result.odds).forEach(([name, val]) => {
    const safeKey = name.replace(/[.#$\/\[\]]/g, '_');
    safeOdds[safeKey] = { ...val, displayName: name };
  });
  const availableOdds = Object.entries(safeOdds).map(([,o])=>({name:o.displayName,dk:o.dk,fd:o.fd,dk_top10:o.dk_top10,dk_cut:o.dk_cut})).sort((a,b)=>a.name.localeCompare(b.name));
  const fdCount = Object.values(safeOdds).filter(o => o.fd).length;
  console.log(`[odds] DK: ${Object.values(safeOdds).filter(o=>o.dk).length} players, FD: ${fdCount} players`);
  draft.oddsCache = safeOdds;
  draft.field = draft.field.map(p => {
    const safeKey = p.name.replace(/[.#$\/\[\]]/g, '_');
    const exact = safeOdds[safeKey];
    if (exact) {
      matched.push(p.name);
      const o = {...p, odds_dk: exact.dk};
      if (exact.fd) o.odds_fd = exact.fd;
      if (exact.dk_top10) o.odds_top10 = exact.dk_top10;
      if (exact.dk_cut) o.odds_cut = exact.dk_cut;
      return o;
    }
    const lastName = p.name.split(' ').pop().toLowerCase();
    const matchKey = Object.keys(safeOdds).find(k=>k.split(' ').pop().toLowerCase()===lastName);
    if (matchKey) {
      matched.push(p.name);
      const o = {...p, odds_dk: safeOdds[matchKey].dk};
      if (safeOdds[matchKey].fd) o.odds_fd = safeOdds[matchKey].fd;
      if (safeOdds[matchKey].dk_top10) o.odds_top10 = safeOdds[matchKey].dk_top10;
      if (safeOdds[matchKey].dk_cut) o.odds_cut = safeOdds[matchKey].dk_cut;
      return o;
    }
    unmatched.push({ name: p.name });
    return p;
  });
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json({ matched: matched.length, unmatched, availableOdds, updated: result.updated });
});

app.post('/golf/:slug/odds/seed', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const seedOdds = {
    'Scottie Scheffler':  { dk: '+450',  fd: '+500'  },
    'Rory McIlroy':       { dk: '+600',  fd: '+650'  },
    'Tommy Fleetwood':    { dk: '+1400', fd: '+1400' },
    'Collin Morikawa':    { dk: '+1600', fd: '+1600' },
    'Xander Schauffele':  { dk: '+1800', fd: '+1800' },
    'Ludvig Aberg':       { dk: '+2000', fd: '+2000' },
    'Bryson DeChambeau':  { dk: '+2200', fd: '+2200' },
    'Viktor Hovland':     { dk: '+2500', fd: '+2500' },
    'Chris Gotterup':     { dk: '+2800', fd: '+3000' },
    'Jon Rahm':           { dk: '+3000', fd: '+3000' },
    'Hideki Matsuyama':   { dk: '+3000', fd: '+3000' },
    'Jordan Spieth':      { dk: '+3500', fd: '+3500' },
    'Justin Thomas':      { dk: '+3500', fd: '+4000' },
    'Min Woo Lee':        { dk: '+4000', fd: '+4000' },
    'Shane Lowry':        { dk: '+4000', fd: '+4000' },
    'Corey Conners':      { dk: '+4500', fd: '+4500' },
    'Patrick Cantlay':    { dk: '+5000', fd: '+5000' },
    'Robert MacIntyre':   { dk: '+5000', fd: '+5500' },
    'Justin Rose':        { dk: '+5000', fd: '+5000' },
    'Tyrrell Hatton':     { dk: '+5000', fd: '+5000' },
    'Wyndham Clark':      { dk: '+5500', fd: '+5500' },
    'Matt Fitzpatrick':   { dk: '+5500', fd: '+6000' },
    'Akshay Bhatia':      { dk: '+6000', fd: '+6000' },
    'Cameron Young':      { dk: '+6000', fd: '+6000' },
    'Harris English':     { dk: '+6500', fd: '+7000' },
    'Sam Burns':          { dk: '+6500', fd: '+6500' },
    'Keegan Bradley':     { dk: '+7000', fd: '+7000' },
    'Max Homa':           { dk: '+7000', fd: '+7000' },
    'Sungjae Im':         { dk: '+7000', fd: '+7500' },
    'Brooks Koepka':      { dk: '+7500', fd: '+8000' },
    'Sepp Straka':        { dk: '+8000', fd: '+8000' },
    'Jason Day':          { dk: '+8000', fd: '+8000' },
    'Russell Henley':     { dk: '+9000', fd: '+9000' },
    'Patrick Reed':       { dk: '+9000', fd: '+10000'},
    'Ryan Fox':           { dk: '+10000',fd: '+10000'},
    'Nick Taylor':        { dk: '+10000',fd: '+10000'},
    'Cameron Smith':      { dk: '+10000',fd: '+10000'},
    'Jacob Bridgeman':    { dk: '+12000',fd: '+12500'},
    'Brian Harman':       { dk: '+12000',fd: '+12000'},
    'Adam Scott':         { dk: '+15000',fd: '+15000'},
    'Dustin Johnson':     { dk: '+15000',fd: '+15000'},
    'JJ Spaun':           { dk: '+15000',fd: '+15000'},
    'Andrew Novak':       { dk: '+15000',fd: '+15000'},
    'Kurt Kitayama':      { dk: '+15000',fd: '+15000'},
    'Aldrich Potgieter':  { dk: '+20000',fd: '+20000'},
    'Maverick McNealy':   { dk: '+20000',fd: '+20000'},
    'Ben Griffin':        { dk: '+20000',fd: '+20000'},
    'Nico Echavarria':    { dk: '+20000',fd: '+20000'},
    'Carlos Ortiz':       { dk: '+25000',fd: '+25000'},
    'Li Haotong':         { dk: '+25000',fd: '+25000'},
    'Brian Campbell':     { dk: '+25000',fd: '+25000'},
    'Harry Hall':         { dk: '+25000',fd: '+25000'},
    'Marco Penge':        { dk: '+30000',fd: '+30000'},
    'Sergio Garcia':      { dk: '+30000',fd: '+30000'},
    'Zach Johnson':       { dk: '+50000',fd: '+50000'},
    'Fred Couples':       { dk: '+50000',fd: '+50000'},
    'Bubba Watson':       { dk: '+50000',fd: '+50000'},
    'Danny Willett':      { dk: '+50000',fd: '+50000'},
    'Charl Schwartzel':   { dk: '+50000',fd: '+50000'},
    'Mike Weir':          { dk: '+50000',fd: '+50000'},
    'Vijay Singh':        { dk: '+50000',fd: '+50000'},
    'Jose Maria Olazabal':{ dk: '+50000',fd: '+50000'},
  };
  // Sanitize keys for Firebase (no dots, #, $, /, [, ])
  const safeOdds = {};
  Object.entries(seedOdds).forEach(([name, val]) => {
    const safeKey = name.replace(/[.#$\/\[\]]/g, '_');
    safeOdds[safeKey] = { ...val, displayName: name };
  });
  draft.oddsCache = safeOdds;
  const matched = [], unmatched = [];
  draft.field = draft.field.map(p => {
    const normalizedP = p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    const matchKey = Object.keys(safeOdds).find(k => k.toLowerCase() === normalizedP);
    if (matchKey) { matched.push(p.name); return { ...p, odds_dk: safeOdds[matchKey].dk, odds_top10: safeOdds[matchKey].dk_top10, odds_cut: safeOdds[matchKey].dk_cut }; }
    // Also try last name match
    const lastName = normalizedP.split(' ').pop();
    const lastMatch = Object.keys(safeOdds).find(k => k.split(' ').pop().toLowerCase() === lastName);
    if (lastMatch) { matched.push(p.name); return { ...p, odds_dk: safeOdds[lastMatch].dk, odds_top10: safeOdds[lastMatch].dk_top10, odds_cut: safeOdds[lastMatch].dk_cut }; }
    unmatched.push({ name: p.name });
    return p;
  });
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  const availableOdds = Object.entries(safeOdds).map(([,o]) => ({ name: o.displayName, dk: o.dk, dk_top10: o.dk_top10, dk_cut: o.dk_cut })).sort((a,b) => a.name.localeCompare(b.name));
  res.json({ matched: matched.length, unmatched, availableOdds, updated: new Date().toISOString(), seeded: true });
});


app.post('/golf/:slug/odds/manual', async (req, res) => {
  const slug = req.params.slug;
  const draft = getOrCreateDraft(slug);
  const { fieldName, oddsName } = req.body;
  if (!draft.oddsCache) return res.status(400).json({ error: 'No odds cache — fetch or seed odds first' });
  const odds = draft.oddsCache[oddsName];
  if (!odds) return res.status(404).json({ error: 'Not found in cache: ' + oddsName });
  draft.field = draft.field.map(p => p.name === fieldName ? { ...p, odds_dk: odds.dk, odds_top10: odds.dk_top10, odds_cut: odds.dk_cut } : p);
  broadcast(slug, { type: 'state', draft });
  await syncDraft(slug, draft);
  res.json({ ok: true });
});


// ── GroupMe ────────────────────────────────────────────────────────
const GROUPME_BOT_TEST = 'af8ec9a284c08aa0c9d0c2e231';
const GROUPME_BOT_LIVE = '36cc1e93ae09476fa837b1b4bd';

async function postGolfGroupMe(slug, botId) {
  // Read draft picks and live scores from Firebase
  const [draftData, liveData] = await Promise.all([
    fbGet(`golf/${slug}/draft`),
    fbGet(`golf/${slug}/live`),
  ]);
  if (!draftData) throw new Error('No draft data found for slug: ' + slug);
  const scores = (liveData && liveData.scores) || {};
  const tournamentName = draftData.name || slug;
  const pot = draftData.pot || 0;
  const owners = draftData.owners || [];
  const picks = draftData.picks || {};

  // Helper: normalize a golfer name to Firebase key (mirrors fetchGolfScores)
  function toKey(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 _-]/g, '_');
  }

  // Helper: last name only
  function lastName(name) {
    const parts = name.trim().split(' ');
    return parts[parts.length - 1];
  }

  // Build owner standings
  const standings = owners.map(owner => {
    const golfers = (picks[owner] && picks[owner].golfers) || [];
    const golferScores = golfers.map(g => {
      const key = toKey(g.name);
      const s = scores[key];
      const cut = s ? s.cut : false;
      const toPar = s ? s.score : 0;
      const display = s ? s.display : 'E';
      return { name: g.name, toPar, display, cut };
    });

    // Top 3 active (non-cut) by score ascending (most negative = best)
    const active = golferScores.filter(g => !g.cut).sort((a, b) => a.toPar - b.toPar);
    const top3 = active.slice(0, 3);
    const total = top3.reduce((sum, g) => sum + g.toPar, 0);
    const totalDisplay = total === 0 ? 'E' : (total > 0 ? '+' + total : '' + total);

    return { owner, total, totalDisplay, golferScores };
  });

  // Sort by total ascending (lower = better)
  standings.sort((a, b) => a.total - b.total);

  // Format message
  const medals = ['🏆', '2️⃣ ', '3️⃣ ', '4️⃣ ', '5️⃣ ', '6️⃣ ', '7️⃣ '];
  const lines = standings.map((s, i) => {
    const golferLine = s.golferScores.map(g => {
      if (g.cut) return '✂️ ' + lastName(g.name);
      return lastName(g.name) + ' ' + g.display;
    }).join(' | ');
    return medals[i] + '  ' + s.totalDisplay + '  ' + s.owner + '\n         (' + golferLine + ')';
  });

  const now = new Date();
  const dateStr = (now.getMonth() + 1) + '/' + now.getDate();
  const msg = [
    '⛳ ' + tournamentName + ' · ' + dateStr,
    '',
    ...lines,
    '',
    '💰 $' + pot + ' pot · Winner takes all',
    '',
    '🔗 gyou.in/golf-live.html?slug=' + slug,
  ].join('\n');

  // Post to GroupMe
  const body = JSON.stringify({ bot_id: botId, text: msg });
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groupme.com',
      path: '/v3/bots/post',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, r => { r.resume(); r.on('end', resolve); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  console.log('[groupme] Posted for slug:', slug, 'bot:', botId);
  return { ok: true, standings: standings.map(s => ({ owner: s.owner, total: s.totalDisplay })) };
}

app.post('/golf/:slug/groupme', async (req, res) => {
  const slug = req.params.slug;
  const botId = (req.body && req.body.botId) || GROUPME_BOT_TEST;
  try {
    const result = await postGolfGroupMe(slug, botId);
    res.json(result);
  } catch(e) {
    console.error('[groupme] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Server + WebSocket ─────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const slug = new URL(req.url, 'http://localhost').searchParams.get('slug');
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return ws.close();
  if (!clients[slug]) clients[slug] = new Set();
  clients[slug].add(ws);
  ws.send(JSON.stringify({ type: 'state', draft: getOrCreateDraft(slug) }));
  ws.on('close', () => clients[slug].delete(ws));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Golf server on port ${PORT}, Firebase: ${!!fbDb}`));
