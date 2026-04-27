<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Golf Draft & Live Tracker</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f3;color:#1a1a1a;font-size:14px;}

.topbar{background:#1a1a1a;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;}
.topbar-title{font-size:16px;font-weight:700;}
.topbar-sub{font-size:11px;color:#666;margin-top:1px;}
.topbar-nav{display:flex;align-items:center;gap:12px;}
.topbar-nav a{color:#aaa;font-size:13px;text-decoration:none;}
.topbar-nav a:hover{color:#fff;}
.comm-toggle{font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid #444;color:#aaa;background:transparent;cursor:pointer;}
.comm-toggle.active{background:#f9a825;color:#1a1a1a;border-color:#f9a825;}

.main{max-width:1400px;margin:0 auto;padding:20px;}
.main-narrow{max-width:600px;margin:0 auto;padding:40px 20px;}

.card{background:#fff;border-radius:12px;border:0.5px solid #e0e0e0;padding:16px;}
.btn{background:#1a1a1a;color:#fff;border:none;font-size:13px;font-weight:600;padding:8px 16px;border-radius:7px;cursor:pointer;transition:background .15s;}
.btn:hover{background:#333;}
.btn:disabled{opacity:0.4;cursor:not-allowed;}
.btn-sm{font-size:12px;padding:5px 11px;border-radius:5px;}
.btn-outline{background:transparent;color:#1a1a1a;border:1px solid #ccc;}
.btn-outline:hover{background:#f0f0ee;}
.btn-green{background:#2e7d32;color:#fff;border:none;}
.btn-green:hover{background:#1b5e20;}
.btn-red{background:#c62828;color:#fff;border:none;}
.btn-red:hover{background:#b71c1c;}
.btn-amber{background:#e65100;color:#fff;border:none;}
.btn-amber:hover{background:#bf360c;}

.form-group{margin-bottom:16px;}
.form-group label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#666;margin-bottom:6px;}
.form-group input,.form-group textarea{width:100%;border:1px solid #ddd;border-radius:7px;padding:9px 12px;font-size:14px;font-family:inherit;color:#1a1a1a;}
.form-group input:focus,.form-group textarea:focus{outline:none;border-color:#1a1a1a;}
.form-group textarea{height:180px;resize:vertical;font-size:12px;}
.owner-check-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;}
.owner-check{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f5f5f3;border-radius:7px;cursor:pointer;font-size:13px;font-weight:500;}
.owner-check input{width:16px;height:16px;cursor:pointer;}

/* Draft */
.draft-layout{display:grid;grid-template-columns:220px 1fr 220px;gap:14px;}
@media(max-width:900px){.draft-layout{grid-template-columns:1fr;}}
.pick-item{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;margin-bottom:3px;font-size:12px;}
.pick-item.current{background:#fff3cd;font-weight:700;border:1.5px solid #ffc107;}
.pick-item.done{opacity:0.35;text-decoration:line-through;}
.pick-item.upcoming{background:#f5f5f3;}
.pick-item.makeup{background:#fce4ec;border:1.5px solid #e57373;}
.pick-num{font-size:10px;color:#aaa;width:18px;flex-shrink:0;}
.pick-phase-alt{font-size:9px;background:#fff3cd;color:#856404;padding:1px 4px;border-radius:3px;margin-left:auto;}
.pick-makeup-badge{font-size:9px;background:#fce4ec;color:#c62828;padding:1px 4px;border-radius:3px;margin-left:auto;}
.timer-bar{background:#fff;border-radius:12px;border:0.5px solid #e0e0e0;padding:12px 20px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;}
.timer-val{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;}
.timer-val.warn{color:#e65100;}
.timer-val.danger{color:#c62828;}
.player-card{background:#f5f5f3;border-radius:8px;padding:9px 10px;cursor:pointer;border:1.5px solid transparent;transition:border-color .1s;margin-bottom:5px;display:flex;align-items:center;gap:6px;}
.player-card:hover{border-color:#bbb;}
.player-card.selected{border-color:#2e7d32;background:#e8f5e9;}
.player-name{font-size:13px;font-weight:600;flex:1;}
.odds-row{display:flex;gap:4px;flex-shrink:0;min-width:140px;justify-content:flex-end;}
.dk{background:#000;color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:4px;}
.fd{background:#1565c0;color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:4px;}
.pool-list{max-height:300px;overflow-y:auto;}
.pool-search{width:100%;border:1px solid #ddd;border-radius:7px;padding:8px 12px;font-size:13px;margin-bottom:10px;}
.pool-search:focus{outline:none;border-color:#1a1a1a;}
.ap-item{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#f5f5f3;border-radius:7px;margin-bottom:5px;font-size:12px;}
.roster-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:14px;}
.roster-col{background:#fff;border-radius:10px;border:0.5px solid #e0e0e0;overflow:hidden;}
.roster-makeup-btn{padding:6px 8px;background:#fff3cd;border-top:1px solid #ffc107;}
.owner-header{font-size:11px;font-weight:700;padding:6px 10px;color:#fff;text-align:center;}
.roster-slot{display:flex;align-items:center;gap:6px;padding:5px 10px;border-bottom:0.5px solid #f0f0f0;font-size:11px;}
.roster-slot.empty{color:#ccc;font-style:italic;}
.roster-slot.makeup{background:#fff3cd;}
.slot-label{font-size:9px;color:#aaa;width:12px;flex-shrink:0;}
.alt-divider{border-top:2px dashed #f0f0f0;}
.order-preview{background:#f5f5f3;border-radius:8px;padding:10px 12px;margin-top:8px;font-size:12px;line-height:2;}
.owner-item{display:flex;align-items:center;gap:10px;padding:9px 12px;background:#f5f5f3;border-radius:8px;margin-bottom:6px;}
.complete-banner{background:#2e7d32;color:#fff;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;}
.makeup-notice{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:10px 14px;font-size:12px;color:#856404;margin-bottom:10px;}

/* Live tracker - history style */
.pot-bar{background:#1a1a1a;color:#fff;border-radius:12px;padding:14px 20px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.pot-total{font-size:28px;font-weight:800;}
.pot-meta{font-size:12px;color:#aaa;margin-top:2px;}
.round-bar{background:#fff;border-radius:10px;border:0.5px solid #e0e0e0;padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
.sub-window-badge{font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;}
.sub-open-r1{background:#e3f2fd;color:#1565c0;}
.sub-open-r2{background:#fff3cd;color:#856404;}
.sub-closed{background:#f5f5f3;color:#aaa;}

/* History-style result cards */
.results-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:10px;background:transparent;}
.result-card{background:#fff;padding:14px;border-radius:10px;border:0.5px solid #e0e0e0;}
.result-card.won{background:#f0faf0;}
.result-card.out{opacity:0.55;}
.result-card.leading{border:2px solid #2e7d32;box-shadow:0 2px 10px rgba(46,125,50,.1);}
.rc-header{font-size:13px;font-weight:700;margin-bottom:7px;padding-bottom:7px;border-bottom:2px solid;display:flex;align-items:center;justify-content:space-between;}
.rc-score{font-size:26px;font-weight:800;margin-bottom:2px;}
.rc-score.under{color:#2e7d32;}
.rc-score.over{color:#c62828;}
.rc-score.even{color:#1a1a1a;}
.rc-score.out-txt{color:#aaa;font-size:14px;}
.rc-rank{font-size:11px;color:#888;margin-bottom:9px;}
.rc-player{font-size:12px;padding:3px 0;display:flex;justify-content:space-between;color:#555;border-bottom:0.5px solid #f5f5f3;}
.rc-player:last-child{border-bottom:none;}
.rc-player.cut{color:#bbb;text-decoration:line-through;}
.rc-player.sub{font-style:italic;color:#1565c0;}
.rc-player.counting{background:#e8f5e9;border-radius:3px;padding:2px 4px;margin:-2px -4px;}
.rc-player.alt{border-top:1.5px solid #eee;margin-top:3px;padding-top:3px;}
.rc-score-val{font-weight:600;flex-shrink:0;margin-left:4px;}
.rc-score-val.under{color:#2e7d32;}
.rc-score-val.over{color:#c62828;}
.alt-lbl{font-size:9px;font-weight:700;color:#856404;margin-right:2px;}
.live-card{background:#fff;border-radius:12px;border:0.5px solid #e0e0e0;overflow:hidden;margin-bottom:14px;}
.live-card-header{padding:12px 16px;border-bottom:0.5px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;}
.live-card-title{font-size:15px;font-weight:700;}
.sub-btn-wrap{display:flex;justify-content:flex-end;padding:8px 12px;border-top:0.5px solid #f0f0f0;}

/* Sparkline */
.spark-card{background:#fff;border-radius:12px;border:0.5px solid #e0e0e0;padding:16px;margin-top:14px;}
.spark-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:12px;}
.spark-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.spark-row:last-child{margin-bottom:0;}
.spark-owner{font-size:12px;font-weight:700;width:50px;flex-shrink:0;}
.spark-val{font-size:12px;font-weight:700;width:36px;text-align:right;flex-shrink:0;}

/* Commissioner panel */
.comm-panel{background:#1a1a1a;border-radius:12px;padding:14px 16px;margin-bottom:14px;}
.comm-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#666;margin-bottom:10px;}
.comm-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}

/* Modals */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.modal{background:#fff;border-radius:14px;padding:24px;max-width:440px;width:100%;max-height:85vh;overflow-y:auto;}
.modal h3{font-size:18px;font-weight:700;margin-bottom:4px;}
.modal-sub{font-size:13px;color:#888;margin-bottom:18px;}
.golfer-option{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f5f5f3;border-radius:8px;margin-bottom:6px;cursor:pointer;border:1.5px solid transparent;}
.golfer-option:hover{border-color:#ccc;}
.golfer-option.selected{border-color:#1565c0;background:#e3f2fd;}

/* Password gate */
.pw-gate{display:none;position:fixed;inset:0;background:#1a1a1a;z-index:9999;align-items:center;justify-content:center;}
.pw-gate.show{display:flex;}
.pw-box{text-align:center;padding:40px 20px;max-width:340px;width:100%;}
.pw-title{font-size:26px;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:6px;}
.pw-sub{font-size:14px;color:#666;margin-bottom:32px;}
.pw-input{width:100%;background:#2a2a2a;border:1px solid #333;border-radius:10px;padding:13px 16px;font-size:16px;color:#fff;font-family:inherit;text-align:center;letter-spacing:.08em;}
.pw-input:focus{outline:none;border-color:#555;}
.pw-input::placeholder{color:#555;letter-spacing:0;}
.pw-btn{margin-top:12px;width:100%;background:#fff;color:#1a1a1a;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;}
.pw-btn:hover{background:#ddd;}
.pw-error{font-size:12px;color:#e53935;margin-top:10px;min-height:16px;}

.section-hdr{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:10px;}
.fb-link{font-size:12px;color:#aaa;text-decoration:none;white-space:nowrap;border:0.5px solid #444;border-radius:5px;padding:4px 10px;}
.fb-link:hover{color:#fff;border-color:#888;}
.fb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;align-items:center;justify-content:center;padding:20px;}
.fb-overlay.open{display:flex;}
.fb-modal{background:#fff;border-radius:16px;padding:28px;width:100%;max-width:420px;position:relative;}
.fb-modal h2{font-size:18px;font-weight:700;margin-bottom:4px;}
.fb-modal p{font-size:13px;color:#888;margin-bottom:20px;}
.fb-close{position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;color:#aaa;cursor:pointer;}
.fb-field{margin-bottom:14px;}
.fb-field label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:5px;}
.fb-field input,.fb-field textarea,.fb-field select{width:100%;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit;}
.fb-field textarea{height:90px;resize:vertical;}
.fb-submit{width:100%;background:#1a1a1a;color:#fff;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:700;cursor:pointer;}
.fb-submit:disabled{opacity:.5;cursor:not-allowed;}

@media(max-width:700px){
  .draft-layout{grid-template-columns:1fr;}
  .roster-grid{grid-template-columns:repeat(2,1fr);}
  .pot-bar{flex-direction:column;align-items:flex-start;}
  .draft-tabs{display:flex;}
  .draft-col{display:none!important;}
  .draft-col.active{display:block!important;}
}
.draft-tabs{display:none;gap:0;margin-bottom:12px;border-radius:8px;overflow:hidden;border:1px solid #ddd;}
.draft-tab{flex:1;padding:9px;text-align:center;font-size:12px;font-weight:700;background:#f5f5f3;border:none;cursor:pointer;color:#888;}
.draft-tab.active{background:#1a1a1a;color:#fff;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;}
.toast.show{opacity:1;}
.stale-warning{color:#e65100;font-size:11px;}
</style>
</head>
<body>

<!-- Main password gate -->
<div class="toast" id="toast"></div>
<div class="pw-gate" id="pw-gate">
  <div class="pw-box">
    <div class="pw-title">Giesener...<br>Are you In?</div>
    <div class="pw-sub">Enter the password to continue</div>
    <input class="pw-input" id="pw-input" type="password" placeholder="password" onkeydown="if(event.key==='Enter')pwCheck()">
    <button class="pw-btn" onclick="pwCheck()">Enter →</button>
    <div class="pw-error" id="pw-error"></div>
  </div>
</div>

<!-- Commissioner password modal -->
<div class="modal-bg" id="comm-pw-modal" style="display:none;">
  <div class="modal" style="max-width:360px;">
    <h3>Commissioner Mode</h3>
    <div class="modal-sub">Enter the commissioner password</div>
    <input type="password" id="comm-pw-input" placeholder="password" style="width:100%;border:1px solid #ddd;border-radius:7px;padding:9px 12px;font-size:14px;font-family:inherit;margin-bottom:12px;" onkeydown="if(event.key==='Enter')checkCommPw()">
    <div style="display:flex;gap:8px;">
      <button class="btn btn-green" onclick="checkCommPw()">Enter</button>
      <button class="btn btn-outline" onclick="document.getElementById('comm-pw-modal').style.display='none'">Cancel</button>
    </div>
    <div id="comm-pw-error" style="font-size:12px;color:#e53935;margin-top:8px;min-height:16px;"></div>
  </div>
</div>

<!-- Topbar -->
<div class="topbar">
  <div>
    <div class="topbar-title" id="tb-title">Golf</div>
    <div class="topbar-sub" id="tb-sub"></div>
  </div>
  <div class="topbar-nav">
    <button class="comm-toggle" id="comm-toggle" onclick="toggleCommMode()">⚙ Comm</button>
    <a href="index.html">← Home</a>
    <a href="golf.html">History</a>
    <a class="fb-link" href="#" onclick="event.preventDefault();openFeedback()">💡 Suggest</a>
  </div>
</div>

<div id="screen"></div>

<!-- Sub modal -->
<div class="modal-bg" id="sub-modal" style="display:none;">
  <div class="modal">
    <h3>Make a Substitution</h3>
    <div class="modal-sub" id="sub-modal-sub"></div>
    <div id="sub-step-1">
      <div style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Which golfer do you want to swap OUT?</div>
      <div id="sub-swap-out-list"></div>
      <button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="document.getElementById('sub-modal').style.display='none'">Cancel</button>
    </div>
    <div id="sub-step-2" style="display:none;">
      <div style="font-size:12px;font-weight:700;color:#1565c0;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Swapping IN:</div>
      <div id="sub-alt-display" style="font-size:14px;font-weight:700;padding:10px 12px;background:#e3f2fd;border-radius:8px;margin-bottom:12px;"></div>
      <div style="font-size:12px;font-weight:700;color:#c62828;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Swapping OUT:</div>
      <div id="sub-confirm-out" style="font-size:14px;font-weight:700;padding:10px 12px;background:#fce4ec;border-radius:8px;margin-bottom:20px;"></div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-green" onclick="confirmSub()">Confirm Sub</button>
        <button class="btn btn-outline" onclick="document.getElementById('sub-step-1').style.display='';document.getElementById('sub-step-2').style.display='none';">Back</button>
        <button class="btn btn-outline" onclick="document.getElementById('sub-modal').style.display='none'">Cancel</button>
      </div>
    </div>
  </div>
</div>

<!-- Makeup pick modal -->
<div class="modal-bg" id="makeup-modal" style="display:none;">
  <div class="modal" style="max-width:500px;">
    <h3>Make Your Pick</h3>
    <div class="modal-sub" id="makeup-modal-sub"></div>
    <input class="pool-search" id="makeup-search" placeholder="Search players…" oninput="renderMakeupPool(this.value)">
    <div style="max-height:360px;overflow-y:auto;" id="makeup-pool"></div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-green" id="makeup-confirm-btn" onclick="confirmMakeupPick()" disabled>Pick…</button>
      <button class="btn btn-outline" onclick="document.getElementById('makeup-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Autopick modal -->
<div class="modal-bg" id="autopick-modal" style="display:none;">
  <div class="modal">
    <h3>Timer expired</h3>
    <div class="modal-sub">Assign a bad golfer placeholder for <strong id="ap-owner-name"></strong>. They can replace it with a real pick later.</div>
    <div id="ap-modal-list"></div>
    <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="document.getElementById('autopick-modal').style.display='none'">Cancel</button>
  </div>
</div>

<!-- Reset modal -->
<div class="modal-bg" id="reset-modal" style="display:none;">
  <div class="modal">
    <h3>Reset Draft?</h3>
    <p style="color:#888;font-size:13px;margin-bottom:20px;">Wipes all picks and returns to setup. Cannot be undone.</p>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-red" onclick="doReset()">Yes, Reset</button>
      <button class="btn btn-outline" onclick="document.getElementById('reset-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Odds modal -->
<div class="modal-bg" id="odds-modal" style="display:none;">
  <div class="modal" style="max-width:500px;">
    <h3>Odds Import</h3>
    <div id="odds-content" style="margin-top:12px;"></div>
  </div>
</div>

<!-- Finalize modal -->
<div class="modal-bg" id="finalize-modal" style="display:none;">
  <div class="modal" style="max-width:480px;">
    <h3>Finalize Tournament</h3>
    <p style="color:#888;font-size:13px;margin:8px 0 16px;">Commits final results to history. Make sure all scores are locked.</p>
    <div id="finalize-summary"></div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-green" onclick="doFinalize()">Commit to History ✓</button>
      <button class="btn btn-outline" onclick="document.getElementById('finalize-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Feedback modal -->
<div class="fb-overlay" id="fb-overlay" onclick="fbClose(event)">
  <div class="fb-modal">
    <button class="fb-close" onclick="closeFeedback()">×</button>
    <h2>Suggest a feature</h2>
    <p>Got an idea? Send it in.</p>
    <div id="fb-form-wrap">
      <form id="fb-form" onsubmit="fbSubmit(event)">
        <div class="fb-field"><label>Your name</label><input type="text" name="name" placeholder="First name" required></div>
        <div class="fb-field"><label>Type</label>
          <select name="type"><option>Feature idea</option><option>New stat</option><option>Bug / something broken</option><option>Other</option></select>
        </div>
        <div class="fb-field"><label>Request</label><textarea name="message" placeholder="Describe your idea…" required></textarea></div>
        <button class="fb-submit" type="submit" id="fb-submit-btn">Send →</button>
      </form>
    </div>
  </div>
</div>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const PROXY = 'https://nba-production-4b6c.up.railway.app';
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyArXeMh4hCEyo2DqXfig3yD03R6oCPZIyk",
  authDomain: "giesener-bets.firebaseapp.com",
  databaseURL: "https://giesener-bets-default-rtdb.firebaseio.com",
  projectId: "giesener-bets",
  storageBucket: "giesener-bets.firebasestorage.app",
  messagingSenderId: "728665249382",
  appId: "1:728665249382:web:ec1635941b04d3aba7ffa7"
};
const ALL_COLORS = { Mark:'#7B1FA2',Marc:'#F9A825',Jared:'#2E7D32',Andrew:'#E65100',Zach:'#1565C0',Ben:'#C62828',Matt:'#AD1457',Max:'#558B2F',Mike:'#00838F',Adam:'#4E342E' };
const ALL_OWNERS = ['Mark','Marc','Jared','Andrew','Zach','Ben','Matt','Mike','Max','Adam'];
const PW_MAIN = 'rudygobert';
const PW_COMM = 'golf';
const FORMSPREE_ID = 'mnjlwlgy';

const fbApp = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(fbApp);
const params = new URLSearchParams(location.search);
const SLUG = params.get('slug') || 'pga-2026';

let draft = null;
let live = null;
let ws = null;
let timerInterval = null;
let selectedPlayer = null;
let searchQuery = '';
let previewOrder = null;
let previewAltOrder = null;
let subOwner = null;
let subSwapOut = null;
let subModalRound = 1;
let makeupOwner = null;
let makeupSlotIndex = null;
let makeupSelected = null;
let scoreHistory = [];
// scoreRefreshInterval removed — server-side polling handles score updates
let isComm = false;

const draftRef = () => ref(db, `golf/${SLUG}/draft`);
const liveRef  = () => ref(db, `golf/${SLUG}/live`);
const histRef  = () => ref(db, `golf/history/${SLUG}`);

// ── Firebase listeners ─────────────────────────────────────────────
// ── Firebase listeners ─────────────────────────────────────────────
onValue(draftRef(), snap => {
  draft = snap.val() || { status: 'setup', name: '', owners: ALL_OWNERS };
  renderScreen();
});
onValue(liveRef(), snap => {
  live = snap.val();
  if (draft?.status === 'live' || draft?.status === 'final') renderScreen();
});

// ── WebSocket ──────────────────────────────────────────────────────
function connectWS() {
  if (ws) return;
  const url = PROXY.replace('https://','wss://').replace('http://','ws://') + '?slug=' + SLUG;
  ws = new WebSocket(url);
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'state') pushDraftToFirebase(msg.draft);
  };
  ws.onclose = () => { ws = null; if (draft?.status === 'drafting') setTimeout(connectWS, 2000); };
  ws.onerror = () => ws?.close();
}

async function pushDraftToFirebase(d) {
  if (!d) return;
  await set(draftRef(), { ...d, undoStack: [], redoStack: [] });
}

async function proxyApi(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${PROXY}/golf/${SLUG}${path}`, opts).then(r => r.json());
}

function showToast(msg, duration=2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function updatedAgo(isoStr) {
  if (!isoStr) return 'No scores yet';
  const mins = Math.floor((Date.now() - new Date(isoStr)) / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins === 1) return 'Updated 1 min ago';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs}h${mins%60>0?' '+mins%60+'m':''} ago`;
}

// ── Commissioner toggle ────────────────────────────────────────────
window.toggleCommMode = function() {
  if (isComm) {
    isComm = false;
    document.getElementById('comm-toggle').classList.remove('active');
    renderScreen();
  } else {
    document.getElementById('comm-pw-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('comm-pw-input').focus(), 50);
  }
};

window.checkCommPw = function() {
  const val = document.getElementById('comm-pw-input').value.trim().toLowerCase();
  if (val === PW_COMM) {
    isComm = true;
    document.getElementById('comm-toggle').classList.add('active');
    document.getElementById('comm-pw-modal').style.display = 'none';
    document.getElementById('comm-pw-input').value = '';
    document.getElementById('comm-pw-error').textContent = '';
    renderScreen();
  } else {
    document.getElementById('comm-pw-error').textContent = 'Wrong password.';
    document.getElementById('comm-pw-input').value = '';
    setTimeout(() => { document.getElementById('comm-pw-error').textContent = ''; }, 2000);
  }
};

// ── Render router ──────────────────────────────────────────────────
function renderScreen() {
  try {
  if (!draft) return;
  const status = draft.status || 'setup';
  document.getElementById('tb-title').textContent = draft.name || 'Golf';
  document.getElementById('tb-sub').textContent = SLUG + ' · ' + {setup:'Setup',lobby:'Lobby',drafting:'Drafting',complete:'Draft Complete',live:'Live 🔴',final:'Final ✅'}[status];
  if (status === 'setup') renderSetup();
  else if (status === 'lobby') renderLobby();
  else if (status === 'drafting') renderDraft();
  else if (status === 'complete') renderComplete();
  else if (status === 'live') renderLive(false);
  else if (status === 'final') renderLive(true);
  } catch(e) {
    console.error('[renderScreen] ERROR:', e);
    document.getElementById('screen').innerHTML = '<div class="main"><p style="color:red;padding:40px;text-align:center;">Render error: ' + e.message + '</p></div>';
  }
}

function color(o) { return ALL_COLORS[o] || '#555'; }
function owners() { return draft?.owners || ALL_OWNERS; }
function fmtScore(s) {
  if (s === null || s === undefined) return '—';
  if (s === 'CUT') return 'CUT';
  if (s === 'OUT') return 'OUT';
  if (typeof s === 'number') return s === 0 ? 'E' : s > 0 ? '+' + s : '' + s;
  return s;
}

// ── SETUP ──────────────────────────────────────────────────────────
let setupStep = 1;
let setupField = [];

function renderSetup() {
  document.getElementById('screen').innerHTML = `
    <div class="main-narrow">
      <div class="card">
        <h2 style="font-size:22px;font-weight:700;margin-bottom:20px;">Commissioner Setup</h2>
        ${setupStep === 1 ? `
        <div class="form-group"><label>Tournament name</label>
          <input type="text" id="s-name" placeholder="e.g. 2026 PGA Championship" value="${draft?.name||''}"></div>
        <div class="form-group"><label>Participants</label>
          <div class="owner-check-grid">${ALL_OWNERS.map(o => `
            <label class="owner-check">
              <input type="checkbox" id="p-${o}" value="${o}" checked>
              <span style="color:${color(o)};font-weight:700;">${o}</span>
            </label>`).join('')}</div>
        </div>
        <div class="form-group"><label>Player field (one name per line)</label>
          <textarea id="s-field" placeholder="Scottie Scheffler&#10;Rory McIlroy&#10;…">${setupField.map(p=>p.name).join('\n')}</textarea></div>
        <button class="btn btn-green" onclick="window.setupStep1Next()">Next: Set Assign List →</button>
        ` : `
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:13px;font-weight:700;">Select players for the quick-assign list</div>
            <div id="assign-count" style="font-size:12px;color:#2e7d32;font-weight:700;">0 selected</div>
          </div>
          <div style="font-size:12px;color:#888;margin-bottom:14px;">These appear on the right during the draft as easy placeholder picks. They stay in the main field too.</div>
          <input class="pool-search" id="assign-search" placeholder="Search…" oninput="window.filterAssignList(this.value)" style="margin-bottom:10px;">
          <div id="assign-list" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
            ${setupField.map(p => `
              <label style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:#f5f5f3;border-radius:7px;cursor:pointer;">
                <input type="checkbox" class="assign-check" value="${p.name.replace(/"/g,'&quot;')}" style="width:16px;height:16px;" onchange="window.updateAssignCount()">
                <span style="font-size:13px;">${p.name}</span>
              </label>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" style="color:#fff;border-color:#444;" onclick="window.setupStepBack()">← Back</button>
          <button class="btn btn-green" onclick="window.submitSetup()">Open Lobby →</button>
        </div>
        `}
      </div>
    </div>`;
}

let setupName = '';
let setupOwners = [];

window.setupStep1Next = function() {
  const nameEl = document.getElementById('s-name');
  if (!nameEl?.value.trim()) { alert('Enter a tournament name.'); return; }
  const fieldText = document.getElementById('s-field').value.trim();
  if (!fieldText) { alert('Enter at least one player.'); return; }
  setupName = nameEl.value.trim();
  setupOwners = ALL_OWNERS.filter(o => document.getElementById('p-' + o)?.checked);
  if (setupOwners.length < 2) { alert('Select at least 2 participants.'); return; }
  setupField = fieldText.split('\n').filter(Boolean).map(l => ({ name: l.trim() }));
  setupStep = 2;
  renderSetup();
};

window.setupStepBack = function() {
  setupStep = 1;
  renderSetup();
};

window.updateAssignCount = function() {
  const n = document.querySelectorAll('.assign-check:checked').length;
  const el = document.getElementById('assign-count');
  if (el) el.textContent = n + ' selected';
};

window.filterAssignList = function(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('#assign-list label').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(lower) ? '' : 'none';
  });
};

window.submitSetup = async function() {
  const autopickList = [...document.querySelectorAll('.assign-check:checked')].map(el => ({ name: el.value }));
  setupStep = 1;
  connectWS();
  await proxyApi('/setup', 'POST', { name: setupName, field: setupField, autopickList, owners: setupOwners });
};

// ── LOBBY ──────────────────────────────────────────────────────────
function renderLobby() {
  const mainPrev = previewOrder ? previewOrder.map((o,i) => `<span style="color:${color(o)};font-weight:700;">${i+1}. ${o}</span>`).join('  ') : '';
  const altPrev  = previewAltOrder ? previewAltOrder.map((o,i) => `<span style="color:${color(o)};font-weight:700;">${i+1}. ${o}</span>`).join('  ') : '';
  const canStart = previewOrder && previewAltOrder;
  // Snake preview — show first 6 picks of the actual sequence
  const snakePreview = previewOrder ? (() => {
    const fwd = previewOrder; const rev = [...previewOrder].reverse();
    const rounds = [fwd, rev, fwd, rev]; // 4 rounds snake
    const picks = rounds.flatMap(r => r).slice(0, 8);
    return picks.map((o,i) => `<span style="color:${color(o)};font-weight:600;font-size:11px;">${i+1}. ${o}</span>`).join(' → ');
  })() : '';
  document.getElementById('screen').innerHTML = `
    <div class="main-narrow">
      <div class="card">
        <h2 style="font-size:22px;font-weight:700;margin-bottom:6px;">${draft.name}</h2>
        <p style="color:#888;font-size:13px;margin-bottom:18px;">Share: <code style="background:#f5f5f3;padding:2px 6px;border-radius:4px;font-size:11px;">${location.href}</code></p>
        <div style="margin-bottom:16px;">${owners().map(o =>
          `<div class="owner-item"><div style="width:8px;height:8px;border-radius:50%;background:${color(o)}"></div>
           <span style="color:${color(o)};font-weight:700;">${o}</span></div>`).join('')}</div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;">Pick Timer</label>
          <div style="display:flex;gap:8px;">
            ${[['2 min','120'],['5 min','300'],['10 min','600'],['2 hr','7200']].map(([label,val]) =>
              `<button class="btn btn-sm ${(lobbyTimer||7200)==val?'btn-amber':'btn-outline'}" style="${(lobbyTimer||7200)==val?'':'color:#555;border-color:#ddd;'}" onclick="window.setLobbyTimer(${val})">${label}</button>`
            ).join('')}
          </div>
        </div>
        <button class="btn btn-outline" style="width:100%;margin-bottom:6px;" onclick="window.genMain()">${previewOrder?'Re-randomize':'Randomize'} Main Order</button>
        ${mainPrev ? `<div class="order-preview">${mainPrev}</div>` : ''}
        ${snakePreview ? `<div style="font-size:11px;color:#888;margin-top:4px;margin-bottom:4px;">Snake: ${snakePreview} →...</div>` : ''}
        <button class="btn btn-outline" style="width:100%;margin-top:12px;margin-bottom:6px;" onclick="window.genAlt()">${previewAltOrder?'Re-randomize':'Randomize'} Alternate Order</button>
        ${altPrev ? `<div class="order-preview">${altPrev}</div>` : ''}
        <button class="btn btn-green" style="width:100%;padding:12px;margin-top:16px;" onclick="window.startDraft()" ${canStart?'':'disabled'}>${canStart?'Start Draft →':'Randomize both orders first'}</button>
        <button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="window.importOdds()">Import DK + FD Odds</button>
        <button class="btn btn-outline" style="width:100%;margin-top:6px;color:#e65100;border-color:#e65100;" onclick="window.seedOdds()">Seed Masters 2026 Odds</button>
        <button class="btn btn-outline btn-sm" style="margin-top:16px;color:#c62828;border-color:#eee;" onclick="document.getElementById('reset-modal').style.display='flex'">Reset to Setup</button>
      </div>
    </div>`;
}

let lobbyTimer = 7200;
function shuffleArr(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }
window.setLobbyTimer = function(val) { lobbyTimer = parseInt(val); renderLobby(); };
window.genMain = function() { previewOrder = shuffleArr(owners()); renderLobby(); };
window.genAlt  = function() { previewAltOrder = shuffleArr(owners()); renderLobby(); };
window.startDraft = async function() {
  if (!previewOrder || !previewAltOrder) return;
  connectWS();
  await proxyApi('/start', 'POST', { pickOrder: previewOrder, altOrder: previewAltOrder, timerDuration: lobbyTimer });
};

// ── DRAFT ──────────────────────────────────────────────────────────
function renderDraft() {
  if (!ws) connectWS();
  // Preserve scroll positions across re-renders
  const pickOrderScroll = document.getElementById('pick-order-list')?.scrollTop || 0;
  const poolScroll = document.getElementById('pool-list')?.scrollTop || 0;
  const cur = getCur();
  const isAlt = draft.currentPhase === 'alternate';
  const seq = draft.pickSequence || [];
  const altSeq = draft.altSequence || [];
  const allPicks = [...seq, ...altSeq];
  const globalIdx = isAlt ? seq.length + draft.currentPickIndex : draft.currentPickIndex;
  const draftMakeupPicks = draft.makeupPicks || {};
  const makeupOwners = Object.keys(draftMakeupPicks);

  const pickOrderHtml = allPicks
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i >= Math.max(0, globalIdx - 3))  // last 3 done + current + upcoming
    .map(({ p, i }) => {
      const done = i < globalIdx, current = i === globalIdx, isA = i >= seq.length;
      return `<div class="pick-item ${done?'done':current?'current':'upcoming'}">
        <span class="pick-num">${i+1}</span>
        <span style="color:${done?'#aaa':color(p.owner)};font-weight:${current?'700':'500'}">${p.owner}</span>
        ${isA ? '<span class="pick-phase-alt">ALT</span>' : ''}
      </div>`;
    }).join('');

  const makeupHtml = makeupOwners.length ? makeupOwners.map(o =>
    `<div class="pick-item makeup">
      <span style="color:${color(o)};font-weight:700;">${o}</span>
      <span class="pick-makeup-badge">MAKEUP</span>
    </div>`).join('') : '';

  const q = searchQuery.toLowerCase();
  const poolHtml = (draft.field || [])
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .map(p => `<div class="player-card ${selectedPlayer?.name===p.name?'selected':''}" onclick="window.selectPlayer(this.dataset.p)" data-p='${JSON.stringify(p).replace(/'/g,"&apos;")}'>
      <div class="player-name">${p.name}</div>
      <div class="odds-row">${p.odds_dk?`<span class="dk">DK ${p.odds_dk}</span>`:''}${p.odds_fd?`<span class="fd">FD ${p.odds_fd}</span>`:''}</div>
    </div>`).join('');

  const apHtml = (draft.autopickList || []).map(p =>
    `<div class="ap-item"><span>${p.name}</span>${cur?`<button class="btn btn-sm btn-red" onclick="window.assignAP('${p.name.replace(/'/g,"\\'")}')">Assign</button>`:''}</div>`
  ).join('') || '<div style="color:#aaa;font-size:12px;padding:4px;">No list set</div>';

  const rosterHtml = owners().map(o => {
    const picks = draft.picks?.[o] || { golfers: [], alternate: null };
    const hasMakeup = draftMakeupPicks[o] !== undefined && draftMakeupPicks[o] !== null;
    console.log(`[rosterMap] ${o}: hasMakeup=${hasMakeup}, draftMakeupPicks[o]=${draftMakeupPicks[o]}`);
    return `<div class="roster-col">
      <div class="owner-header" style="background:${color(o)}">${o}${hasMakeup?' ⚠️':''}</div>
      ${Array(4).fill(0).map((_,i) => {
        const g = picks.golfers[i];
        const isMakeupSlot = hasMakeup && draftMakeupPicks[o] === i;
        return `<div class="roster-slot ${g?'':'empty'} ${isMakeupSlot?'makeup':''}">
          <span class="slot-label">${i+1}</span>
          <span>${g ? (g.isBadGolfer ? `⚠ ${g.name}` : g.name) : '—'}</span>
        </div>`;
      }).join('')}
      <div class="alt-divider">
        <div class="roster-slot ${picks.alternate?'':'empty'}">
          <span class="slot-label" style="color:#856404;">A</span>
          <span>${picks.alternate?picks.alternate.name:'—'}</span>
        </div>
      </div>
      ${hasMakeup ? `<div style="padding:6px 8px;background:#fff3cd;border-top:2px solid #ffc107;display:block;"><button class="btn btn-sm btn-amber" style="width:100%;font-size:11px;font-weight:700;display:block;" onclick="window.openMakeupModal('${o}')">⚠ Make Pick</button></div>` : ''}
      ${hasMakeup && !isComm ? '' : ''}
    </div>`;
  }).join('');

  document.getElementById('screen').innerHTML = `
    <div style="padding:14px 20px 0;display:flex;gap:8px;justify-content:flex-end;align-items:center;">
      <button class="btn btn-sm btn-outline" onclick="window.doUndo()" ${(draft.currentPickIndex > 0 || draft.currentPhase === 'alternate') ? '' : 'disabled'} style="color:#fff;border-color:#666;background:#2a2a2a;">↩ Undo</button>
      <button class="btn btn-sm btn-outline" onclick="window.doRedo()" style="color:#fff;border-color:#666;background:#2a2a2a;">↪ Redo</button>
      ${isComm ? `<button class="btn btn-sm btn-red" onclick="document.getElementById('reset-modal').style.display='flex'">Reset Draft</button>` : ''}
    </div>
    ${isComm ? `<div style="background:#1a1a1a;border-bottom:1px solid #333;padding:8px 20px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Commissioner</span>
    </div>` : ''}
    <div class="main">
      ${makeupOwners.length ? `<div class="makeup-notice">⚠️ <strong>${makeupOwners.join(', ')}</strong> ${makeupOwners.length===1?'has':'have'} a pending makeup pick. Click "Make Pick" on their roster card.</div>` : ''}
      <div class="timer-bar">
        <div>
          <div style="font-size:11px;color:#888;">${isAlt?'ALTERNATE ROUND':`Round ${cur?.round||''} of 4`}</div>
          <div style="font-size:17px;font-weight:700;color:${cur?color(cur.owner):'#2e7d32'}">${cur?`${cur.owner} is on the clock`:'Draft complete!'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#888;">Time remaining</div>
          <div class="timer-val" id="timer-display">2:00:00</div>
        </div>
      </div>
      <div class="draft-tabs">
        <button class="draft-tab active" onclick="window.switchDraftTab(0,this)">Order</button>
        <button class="draft-tab" onclick="window.switchDraftTab(1,this)">Pool</button>
        <button class="draft-tab" onclick="window.switchDraftTab(2,this)">Rosters</button>
      </div>
      <div class="draft-layout">
        <div class="card draft-col active">
          <div class="section-hdr">Pick Order</div>
          ${makeupHtml ? `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #eee;">${makeupHtml}</div>` : ''}
          <div id="pick-order-list">${pickOrderHtml}</div>
        </div>
        <div class="card draft-col active">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div class="section-hdr" style="margin-bottom:0;">Available (${draft.field?.length||0})</div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-sm btn-outline" onclick="window.importOdds()">Odds</button>
              <button class="btn btn-sm btn-outline" style="color:#e65100;border-color:#e65100;" onclick="window.seedOdds()">Seed Odds</button>
              <button class="btn btn-sm btn-green" id="pick-btn" onclick="window.confirmPick()" ${selectedPlayer?'':'disabled'}>${selectedPlayer?`Pick ${selectedPlayer.name}`:'Pick...'}</button>
            </div>
          </div>
          <input class="pool-search" id="search-input" placeholder="Search players…" value="${searchQuery}" oninput="window.onSearch(this.value)">
          <div class="pool-list" id="pool-list">${poolHtml}</div>
        </div>
        <div class="card draft-col active">
          <div class="section-hdr">Assign List</div>
          <p style="font-size:11px;color:#888;margin-bottom:10px;">Assign as placeholder — owner makes a real pick later.</p>
          ${(draft.autopickList || [])
            .filter(p => (draft.field || []).some(f => f.name === p.name))
            .map(p => `<div class="ap-item"><span>${p.name}</span>${cur?`<button class="btn btn-sm btn-red" onclick="window.assignAP('${p.name.replace(/'/g,"\\'")}')">Assign</button>`:''}</div>`)
            .join('') || '<div style="color:#aaa;font-size:12px;padding:4px;">All assigned or none set</div>'}
        </div>
      </div>
      <div class="roster-grid">${rosterHtml}</div>
    </div>`;

  // Restore scroll positions
  if (pickOrderScroll) { const el = document.getElementById('pick-order-list'); if (el) el.scrollTop = pickOrderScroll; }
  if (poolScroll) { const el = document.getElementById('pool-list'); if (el) el.scrollTop = poolScroll; }

  if (!timerInterval) startTimer();
}

function getCur() {
  if (!draft) return null;
  const seq = draft.currentPhase === 'main' ? draft.pickSequence : draft.altSequence;
  return seq?.[draft.currentPickIndex] || null;
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (draft?.status !== 'drafting') { clearInterval(timerInterval); timerInterval = null; return; }
    const el = document.getElementById('timer-display');
    if (!el) { clearInterval(timerInterval); timerInterval = null; return; }
    const secs = getTimerSecs();
    el.textContent = formatTime(secs);
    el.className = 'timer-val' + (secs<300?' danger':secs<900?' warn':'');
    if (secs === 0) { clearInterval(timerInterval); timerInterval = null; showAutopick(); }
  }, 1000);
}

function getTimerSecs() {
  if (!draft?.timerStart) return draft?.timerDuration || 7200;
  return Math.max(0, (draft.timerDuration || 7200) - Math.floor((Date.now() - draft.timerStart) / 1000));
}
function formatTime(s) { return `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

function showAutopick() {
  const cur = getCur();
  if (!cur) return;
  document.getElementById('ap-owner-name').textContent = cur.owner;
  document.getElementById('ap-modal-list').innerHTML = (draft.autopickList||[]).map(p =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#f5f5f3;border-radius:7px;margin-bottom:6px;">
      <span>${p.name}</span>
      <button class="btn btn-sm btn-red" onclick="window.apModalPick('${p.name.replace(/'/g,"\\'")}')">Assign</button>
    </div>`).join('') || '<div style="color:#aaa;">No list set</div>';
  document.getElementById('autopick-modal').style.display = 'flex';
}

window.selectPlayer = function(pJson) {
  try { selectedPlayer = typeof pJson === 'string' ? JSON.parse(pJson) : pJson; }
  catch(e) { console.error('selectPlayer parse error', e); return; }
  // Update pool selection highlight in place
  const poolEl = document.getElementById('pool-list');
  if (poolEl) {
    poolEl.querySelectorAll('.player-card').forEach(el => {
      try {
        const p = JSON.parse(el.dataset.p.replace(/&apos;/g, "'"));
        el.classList.toggle('selected', p.name === selectedPlayer?.name);
      } catch(e) {}
    });
  }
  // Update pick button in place
  const pickBtn = document.getElementById('pick-btn');
  if (pickBtn) {
    pickBtn.disabled = !selectedPlayer;
    pickBtn.textContent = selectedPlayer ? `Pick ${selectedPlayer.name}` : 'Pick...';
  }
};
window.onSearch = function(val) {
  searchQuery = val;
  // Update pool in place — avoid full re-render which kills focus
  const poolEl = document.getElementById('pool-list');
  if (!poolEl) { renderDraft(); return; }
  const q = val.toLowerCase();
  const poolHtml = (draft.field || [])
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .map(p => `<div class="player-card ${selectedPlayer?.name===p.name?'selected':''}" onclick="window.selectPlayer(this.dataset.p)" data-p='${JSON.stringify(p).replace(/'/g,"&apos;")}'>
      <div class="player-name">${p.name}</div>
      <div class="odds-row">${p.odds_dk?`<span class="dk">DK ${p.odds_dk}</span>`:''}${p.odds_fd?`<span class="fd">FD ${p.odds_fd}</span>`:''}</div>
    </div>`).join('');
  poolEl.innerHTML = poolHtml;
};

window.confirmPick = async function() {
  if (!selectedPlayer) return;
  const cur = getCur();
  if (!cur) return;
  const g = selectedPlayer;
  selectedPlayer = null; searchQuery = '';
  showToast(`✓ ${cur.owner} picked ${g.name}`);
  await proxyApi('/pick', 'POST', { owner: cur.owner, golfer: g });
};

// Bad golfer assign — marks slot as makeup-pending
window.apModalPick = async function(name) {
  const cur = getCur();
  if (!cur) return;
  document.getElementById('autopick-modal').style.display = 'none';
  const slotIndex = (draft.picks?.[cur.owner]?.golfers?.length) || 0;
  await proxyApi('/pick', 'POST', { owner: cur.owner, golfer: { name, isBadGolfer: true }, isAutopick: true });
  await proxyApi('/makeup-set', 'POST', { owner: cur.owner, slotIndex });
};

window.assignAP = async function(name) {
  const cur = getCur();
  if (!cur) return;
  if (!confirm(`Assign "${name}" to ${cur.owner} as placeholder?`)) return;
  const slotIndex = (draft.picks?.[cur.owner]?.golfers?.length) || 0;
  const golfer = (draft.field || []).find(p => p.name === name) || { name };
  // Pick the golfer (removes from field, advances draft)
  await proxyApi('/pick', 'POST', { owner: cur.owner, golfer: { ...golfer, isBadGolfer: true }, isAutopick: true });
  // Set makeupPicks on the proxy (included in sync, survives undo/redo)
  await proxyApi('/makeup-set', 'POST', { owner: cur.owner, slotIndex });
};

// Makeup pick flow
window.openMakeupModal = function(owner) {
  makeupOwner = owner;
  makeupSelected = null;
  document.getElementById('makeup-modal-sub').textContent = `${owner} — pick any available player to replace your placeholder.`;
  document.getElementById('makeup-search').value = '';
  document.getElementById('makeup-confirm-btn').disabled = true;
  document.getElementById('makeup-confirm-btn').textContent = 'Pick…';
  renderMakeupPool('');
  document.getElementById('makeup-modal').style.display = 'flex';
};

window.renderMakeupPool = function(q) {
  const lower = q.toLowerCase();
  const pool = (draft.field || []).filter(p => !lower || p.name.toLowerCase().includes(lower));
  document.getElementById('makeup-pool').innerHTML = pool.map(p =>
    `<div class="player-card ${makeupSelected?.name===p.name?'selected':''}" onclick="window.selectMakeup(this.dataset.p)" data-p='${JSON.stringify(p).replace(/'/g,"&apos;")}'>
      <div class="player-name">${p.name}</div>
    </div>`).join('') || '<div style="color:#aaa;padding:8px;">No players found</div>';
};

window.selectMakeup = function(pJson) {
  try { makeupSelected = JSON.parse(pJson); }
  catch(e) { return; }
  const btn = document.getElementById('makeup-confirm-btn');
  btn.disabled = false;
  btn.textContent = `Pick ${makeupSelected.name}`;
  renderMakeupPool(document.getElementById('makeup-search').value);
};

window.confirmMakeupPick = async function() {
  if (!makeupOwner || !makeupSelected) return;
  const slotIndex = draft.makeupPicks?.[makeupOwner];
  if (slotIndex === undefined || slotIndex === null) return;

  // Get the placeholder name before clearing
  const placeholder = draft.picks?.[makeupOwner]?.golfers?.[slotIndex];
  const placeholderName = placeholder?.name || null;

  // Proxy handles: replace slot, remove real pick from field, add placeholder back, clear makeupPicks
  await proxyApi('/makeup-clear', 'POST', {
    owner: makeupOwner,
    realPickName: makeupSelected.name,
    placeholderName
  });

  document.getElementById('makeup-modal').style.display = 'none';
  showToast(`✓ ${makeupOwner}'s pick: ${makeupSelected.name}`);
  makeupOwner = null; makeupSelected = null;
};

window.switchDraftTab = function(idx) {
  document.querySelectorAll('.draft-tab').forEach((t,i) => t.classList.toggle('active', i===idx));
  document.querySelectorAll('.draft-col').forEach((c,i) => c.classList.toggle('active', i===idx));
};
window.doUndo = async function() { await proxyApi('/undo', 'POST'); };
window.doRedo = async function() { await proxyApi('/redo', 'POST'); };

// ── DRAFT COMPLETE ─────────────────────────────────────────────────
function renderComplete() {
  const draftMakeupPicks = draft.makeupPicks || {};
  const makeupOwners = Object.keys(draftMakeupPicks);

  const rosterHtml = owners().map(o => {
    const picks = draft.picks?.[o] || { golfers: [], alternate: null };
    const hasMakeup = draftMakeupPicks[o] !== undefined && draftMakeupPicks[o] !== null;
    return `<div class="roster-col">
      <div class="owner-header" style="background:${color(o)}">${o}${hasMakeup?' ⚠️':''}</div>
      ${picks.golfers.map((g,i) => {
        const isMakeupSlot = hasMakeup && draftMakeupPicks[o] === i;
        return `<div class="roster-slot ${isMakeupSlot?'makeup':''}">
          <span class="slot-label">${i+1}</span>
          <span>${g.isBadGolfer ? `⚠ ${g.name}` : g.name}</span>
        </div>`;
      }).join('')}
      <div class="alt-divider">
        <div class="roster-slot ${picks.alternate?'':'empty'}">
          <span class="slot-label" style="color:#856404;">A</span>
          <span>${picks.alternate?picks.alternate.name:'—'}</span>
        </div>
      </div>
      ${hasMakeup ? `<div class="roster-makeup-btn"><button class="btn btn-sm btn-amber" style="width:100%;font-size:11px;" onclick="window.openMakeupModal('${o}')">Make Pick</button></div>` : ''}
    </div>`;
  }).join('');

  const commSection = isComm ? `
    <div class="comm-panel">
      <div class="comm-label">Commissioner Controls</div>
      <div class="comm-actions">
        <button class="btn btn-green" onclick="window.goLive()" ${makeupOwners.length ? 'disabled title="Resolve pending makeup picks first"' : ''}>Go Live →</button>
        <button class="btn btn-sm btn-outline" style="color:#fff;border-color:#444;" onclick="document.getElementById('reset-modal').style.display='flex'">Reset Draft</button>
      </div>
    </div>` : '';

  document.getElementById('screen').innerHTML = `
    <div class="main">
      <div class="complete-banner">
        <div style="font-size:22px;font-weight:800;">Draft Complete! 🏌️</div>
        <div style="margin-top:6px;opacity:.85;">All picks locked. Commissioner opens the live tracker when the tournament begins.</div>
      </div>
      ${makeupOwners.length ? `<div class="makeup-notice">⚠️ <strong>${makeupOwners.join(', ')}</strong> ${makeupOwners.length===1?'has':'have'} a pending makeup pick. Click "Make Pick" on their roster card.</div>` : ''}
      ${commSection}
      <div class="roster-grid">${rosterHtml}</div>
    </div>`;
}

window.goLive = async function() {
  await set(liveRef(), {
    round: 1,
    subWindowOpen: false,
    subWindowRound: null,
    subs: [],
    pot: (draft.owners?.length || 7) * 25,
    espnEventId: null,
    scores: {},
    lastUpdated: null
  });
  await update(draftRef(), { status: 'live' });
};

// ── LIVE TRACKER ───────────────────────────────────────────────────
function renderLive(isFinal) {
  if (!live) { document.getElementById('screen').innerHTML = '<div class="main"><p style="color:#888;padding:40px;text-align:center;">Loading live data…</p></div>'; return; }

  // Scores are refreshed server-side every 30 min — no client interval needed

  const pot = live.pot || (owners().length * 25);
  const subs = Array.isArray(live.subs) ? live.subs : Object.values(live.subs || {});
  const potSubText = subs.map(s => `${s.owner} subbed R${s.round} (+$${s.cost})`).join(' · ');
  const lbData = buildLeaderboard();
  const subOpen = live.subWindowOpen || false;
  const subRound = live.subWindowRound || 1;

  const subBadge = subOpen
    ? `<span class="sub-window-badge ${subRound===1?'sub-open-r1':'sub-open-r2'}">Sub Window Open — R${subRound} ($${subRound===1?5:15})</span>`
    : `<span class="sub-window-badge sub-closed">${isFinal?'Final':'Sub Windows Closed'}</span>`;

  const commHtml = isComm ? `
    <div class="comm-panel">
      <div class="comm-label">Commissioner Controls</div>
      <div class="comm-actions">
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="text" id="espn-id-input" value="${live.espnEventId||''}" placeholder="ESPN Event ID" style="border:1px solid #444;background:#2a2a2a;color:#fff;border-radius:6px;padding:5px 10px;font-size:12px;width:150px;">
          <button class="btn btn-sm btn-outline" style="color:#fff;border-color:#444;" onclick="window.setEspnId()">Set</button>
        </div>
        <button class="btn btn-sm ${subOpen&&subRound===1?'btn-red':subOpen&&subRound===2?'btn-outline':'btn-amber'}" style="${subOpen&&subRound===2?'color:#555;border-color:#555;cursor:not-allowed;opacity:0.45;':''}" onclick="window.toggleSubR1()" ${subOpen&&subRound===2?'disabled':''}>R1 Sub Window ($5) ${subOpen&&subRound===1?'— Close':subOpen&&subRound===2?'— Locked':'— Open'}</button>
        <button class="btn btn-sm ${subOpen&&subRound===2?'btn-red':subOpen&&subRound===1?'btn-outline':'btn-amber'}" style="${subOpen&&subRound===1?'color:#555;border-color:#555;cursor:not-allowed;opacity:0.45;':''}" onclick="window.toggleSubR2()" ${subOpen&&subRound===1?'disabled':''}>R2 Sub Window ($15) ${subOpen&&subRound===2?'— Close':subOpen&&subRound===1?'— Locked':'— Open'}</button>
        <button class="btn btn-sm btn-outline" style="color:#fff;border-color:#444;" onclick="window.refreshScores()">↻ Refresh Scores</button>
        ${!isFinal
          ? '<button class="btn btn-sm btn-green" onclick="window.openFinalize()">Finalize →</button>'
          : live.committedAt
            ? '<span style="font-size:11px;color:#aaa;">Committed ' + new Date(live.committedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</span><button class="btn btn-sm btn-outline" style="color:#fff;border-color:#444;" onclick="window.undoCommit()">Undo Commit</button>'
            : '<button class="btn btn-sm btn-green" onclick="window.openFinalize()">Commit to History →</button><button class="btn btn-sm btn-outline" style="color:#fff;border-color:#444;" onclick="window.undoFinalize()">Undo Finalize</button>'
        }
      </div>
    </div>` : '';

  // Build history-style cards — sorted by leaderboard position
  const cards = lbData.map((entry, i) => {
    const isLeader = i === 0 && !entry.out;
    const isWinner = isFinal && isLeader;
    const scoreVal = entry.out ? 'OUT' : (entry.teamScore === null ? '—' : fmtScore(entry.teamScore));
    const scoreCls = entry.out ? 'out-txt' : (entry.teamScore < 0 ? 'under' : entry.teamScore > 0 ? 'over' : 'even');
    const rankTxt = entry.out ? 'Eliminated' : (isWinner ? 'Winner 🏆' : (isLeader ? '🔴 Leading' : `#${i+1}`));

    const playerRows = entry.displayGolfers.map(g => {
      const isCounting = !entry.out && entry.countingNames?.includes(g.name) && !g.cut && !g.subOut;
      const sv = g.cut ? 'CUT' : (g.liveScore !== undefined ? fmtScore(g.liveScore) : '—');
      const svCls = g.liveScore < 0 ? 'under' : g.liveScore > 0 ? 'over' : '';
      return `<div class="rc-player ${g.cut?'cut':''} ${g.sub?'sub':''} ${isCounting?'counting':''}">
        <span>${g.name}</span>
        <span class="rc-score-val ${svCls}">${sv}</span>
      </div>`;
    }).join('');

    const alt = entry.alternate;
    let altRow = '';
    if (alt) {
      const isBenched = alt.benchedOut; // swapped-out golfer sitting in alt slot
      const altSv = isBenched ? '—' : (alt.cut ? 'CUT' : (alt.liveScore !== undefined ? fmtScore(alt.liveScore) : '—'));
      const altCls = !isBenched && alt.liveScore < 0 ? 'under' : !isBenched && alt.liveScore > 0 ? 'over' : '';
      const altLabel = isBenched ? 'OUT' : 'A';
      const altLabelColor = isBenched ? '#c62828' : '#856404';
      altRow = `<div class="rc-player alt ${!isBenched&&alt.cut?'cut':''}" style="${isBenched?'color:#bbb;font-style:italic;':''}">
        <span><span class="alt-lbl" style="color:${altLabelColor}">${altLabel}</span>${alt.name}</span>
        <span class="rc-score-val ${altCls}">${altSv}</span>
      </div>`;
    }

    const hasMakeup = (draft?.makeupPicks?.[entry.owner] !== undefined) && (draft?.makeupPicks?.[entry.owner] !== null);
    const makeupBtnHtml = hasMakeup && isComm
      ? `<div class="sub-btn-wrap"><button class="btn btn-sm" style="background:#c62828;color:#fff;width:100%;" onclick="window.openMakeupModal('${entry.owner}')">⚠ Make Pick for ${entry.owner}</button></div>`
      : hasMakeup
      ? `<div class="sub-btn-wrap"><button class="btn btn-sm btn-amber" style="width:100%;" onclick="window.openMakeupModal('${entry.owner}')">Make Pick</button></div>`
      : '';

    const subBtnHtml = !isFinal && subOpen && !entry.hasSubbed && entry.alternate && !entry.alternate.benchedOut
      ? `<div class="sub-btn-wrap"><button class="btn btn-sm btn-amber" onclick="window.openSubModal('${entry.owner}')">Sub In Alternate ($${subRound===1?5:15})</button></div>` : '';

    // Draft pick number: first pick in pickSequence for this owner
    const pickSeq = draft?.pickSequence || [];
    const pickNum = pickSeq.findIndex(p => p.owner === entry.owner) + 1;
    const pickPill = pickNum > 0 ? `<span style="display:inline-block;font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:20px;background:#f0f0f0;color:#888;float:right;">#${pickNum}</span>` : '';

    return `<div class="result-card ${isWinner?'won':''} ${isLeader&&!isFinal?'leading':''} ${entry.out?'out':''}">
      <div class="rc-header" style="color:${color(entry.owner)};border-color:${color(entry.owner)};">
        <span>${isWinner?'🏆 ':''}${entry.owner}</span>${pickPill}
      </div>
      <div class="rc-score ${scoreCls}">${scoreVal}</div>
      <div class="rc-rank">${rankTxt}</div>
      ${playerRows}${altRow}
      ${makeupBtnHtml}${subBtnHtml}
    </div>`;
  }).join('');

  const sparkHtml = scoreHistory.length > 1 ? buildSparklines(lbData) : '';

  document.getElementById('screen').innerHTML = `
    <div class="main">
      ${commHtml}
      <div class="pot-bar">
        <div>
          <div style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">Total Pot</div>
          <div class="pot-total">$${pot}</div>
          ${potSubText ? `<div class="pot-meta">${potSubText}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;margin-bottom:4px;" id="updated-ago-display">
            ${(() => { const mins = live.lastUpdated ? Math.floor((Date.now()-new Date(live.lastUpdated))/60000) : null; return `<span class="${mins!==null&&mins>45?'stale-warning':''}" style="color:${mins!==null&&mins>45?'':'#aaa'}">${updatedAgo(live.lastUpdated)}${mins!==null&&mins>45?' ⚠':''}` + '</span>'; })()}
          </div>
          ${subBadge}
        </div>
      </div>
      <div class="round-bar">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:15px;font-weight:800;">Round ${live.round||1}</div>
          ${isComm ? `<div style="display:flex;gap:4px;">${[1,2,3,4].map(r => '<button class="btn btn-sm ' + ((live.round||1)===r ? 'btn-amber' : 'btn-outline') + '" style="padding:2px 9px;font-size:11px;' + ((live.round||1)===r ? '' : 'color:#fff;border-color:#555;') + '" onclick="window.setRound(' + r + ')">' + r + '</button>').join('')}</div>` : ''}
        </div>
        <div style="font-size:12px;color:#888;">${owners().length} players · ${subs.length} sub${subs.length!==1?'s':''} used</div>
      </div>
      <div class="results-grid">${cards}</div>
      ${sparkHtml}
    </div>`;

  // Refresh "updated X min ago" every minute without full re-render
  clearInterval(window._agoInterval);
  window._agoInterval = setInterval(() => {
    const el = document.getElementById('updated-ago-display');
    if (!el || !live) { clearInterval(window._agoInterval); return; }
    const mins = live.lastUpdated ? Math.floor((Date.now()-new Date(live.lastUpdated))/60000) : null;
    el.innerHTML = `<span class="${mins!==null&&mins>45?'stale-warning':''}" style="color:${mins!==null&&mins>45?'':'#aaa'}">${updatedAgo(live.lastUpdated)}${mins!==null&&mins>45?' ⚠':''}</span>`;
  }, 60000);
}

// ── Leaderboard computation ────────────────────────────────────────
function buildLeaderboard() {
  const scores = live?.scores || {};
  const subs = Array.isArray(live?.subs) ? live.subs : Object.values(live?.subs || {});

  return owners().map(owner => {
    const picks = draft?.picks?.[owner] || { golfers: [], alternate: null };
    const ownerSub = subs.find(s => s.owner === owner);

    // Build display golfers — sub is a clean swap
    let displayGolfers = picks.golfers.map(g => ({ ...g }));
    let alternate = picks.alternate ? { ...picks.alternate } : null;

    if (ownerSub) {
      // Alternate takes the swapped-out golfer's place in the main 4 (italicized)
      displayGolfers = displayGolfers
        .filter(g => g.name !== ownerSub.from)
        .concat([{ name: ownerSub.to, sub: true }]);
      // Swapped-out golfer moves to alt slot (grayed, italic — "benched")
      alternate = { name: ownerSub.from, benchedOut: true };
    }

    // Apply live scores
    displayGolfers = displayGolfers.map(g => ({
      ...g,
      liveScore: scores[g.name]?.score,
      cut: scores[g.name]?.cut || g.cut
    }));
    if (alternate && !alternate.benchedOut) {
      alternate = {
        ...alternate,
        liveScore: scores[alternate.name]?.score,
        cut: scores[alternate.name]?.cut || alternate.cut
      };
    }

    const active = displayGolfers.filter(g => !g.cut && g.liveScore !== undefined);
    const cutCount = displayGolfers.filter(g => g.cut).length;
    const isOut = cutCount >= 2;

    const sorted = [...active].sort((a,b) => a.liveScore - b.liveScore);
    const counting = sorted.slice(0, 3);
    const teamScore = counting.reduce((s,g) => s + (g.liveScore||0), 0);

    return {
      owner, displayGolfers, alternate,
      teamScore: isOut ? null : (active.length === 0 ? null : teamScore),
      out: isOut,
      activeCount: active.length,
      hasSubbed: !!ownerSub,
      countingNames: counting.map(g => g.name)
    };
  }).sort((a,b) => {
    if (a.out && !b.out) return 1;
    if (!a.out && b.out) return -1;
    if (a.teamScore === null && b.teamScore !== null) return 1;
    if (a.teamScore !== null && b.teamScore === null) return -1;
    return (a.teamScore||0) - (b.teamScore||0);
  });
}

// ── Sparklines ─────────────────────────────────────────────────────
function buildSparklines(lbData) {
  const lines = owners().map(owner => {
    const vals = scoreHistory.map(h => h.scores[owner]).filter(v => v !== null && v !== undefined);
    if (vals.length < 2) return '';
    const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1, range = max - min || 1;
    const w = 200, h = 28;
    const pts = vals.map((v,i) => `${(i/(vals.length-1))*w},${h-((v-min)/range)*h}`).join(' ');
    const cur = vals[vals.length-1];
    return `<div class="spark-row">
      <div class="spark-owner" style="color:${color(owner)}">${owner}</div>
      <svg class="spark-svg" style="flex:1;height:28px;" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polyline points="${pts}" fill="none" stroke="${color(owner)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <div class="spark-val" style="color:${cur<0?'#2e7d32':cur>0?'#c62828':'#1a1a1a'}">${fmtScore(cur)}</div>
    </div>`;
  }).join('');
  return `<div class="spark-card"><div class="spark-title">Score Trend</div>${lines}</div>`;
}

// ── Score refresh ──────────────────────────────────────────────────
window.refreshScores = async function(explicitId) {
  const eventId = explicitId || live?.espnEventId;
  if (!eventId) return; // silently skip if no ID set
  try {
    // Pass event ID directly in the URL so proxy doesn't need it in memory
    const data = await proxyApi('/scores?eventId=' + encodeURIComponent(eventId), 'GET');
    if (data.error) { if (isComm) alert('Score fetch error: ' + data.error); return; }
    // Apply fuzzy name matching before saving
    const matched = applyFuzzyScores(data.players);
    await update(liveRef(), { scores: matched, lastUpdated: new Date().toISOString() });
    const ownerScores = {};
    buildLeaderboard().forEach(e => { ownerScores[e.owner] = e.teamScore; });
    scoreHistory.push({ ts: Date.now(), scores: ownerScores });
    if (scoreHistory.length > 50) scoreHistory.shift();
  } catch(e) { if (isComm) alert('Error: ' + e.message); }
};

// Sanitize name for Firebase key lookup (mirrors server.js)
function sanitizeKey(name) { return name.replace(/[.#$\/\[\]]/g, '_'); }

function normalizeStr(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Fuzzy name matching: try exact, then sanitized, then last-name
function applyFuzzyScores(espnPlayers) {
  if (!espnPlayers) return {};
  const allNames = owners().flatMap(o => {
    const picks = draft?.picks?.[o] || { golfers: [], alternate: null };
    return [...picks.golfers.map(g => g.name), picks.alternate?.name].filter(Boolean);
  });
  const result = {};
  // Build lookup by last name and full name (lowercase)
  const espnByFull = {};
  const espnByLast = {};
  const espnLastNameCount = {};
  Object.entries(espnPlayers).forEach(([name, data]) => {
    espnByFull[normalizeStr(name)] = { name, data };
    const parts = normalizeStr(name).split(' ');
    const last = parts[parts.length - 1];
    espnLastNameCount[last] = (espnLastNameCount[last] || 0) + 1;
    if (!espnByLast[last]) espnByLast[last] = { name, data };
  });
  // For each draft name, try to find a match
  allNames.forEach(draftName => {
    const lower = normalizeStr(draftName);
    // 1. Exact match (normalized)
    if (espnByFull[lower]) { result[draftName] = espnByFull[lower].data; return; }
    // 1b. Sanitized key match (e.g. "J.J. Spaun" -> "J_J_ Spaun")
    const safeKey = sanitizeKey(draftName);
    const safeData = espnPlayers[safeKey];
    if (safeData) { result[draftName] = safeData; return; }
    // 2. Last name match — only if unambiguous (one ESPN player with that last name)
    const lastName = lower.split(' ').pop();
    if (espnByLast[lastName] && espnLastNameCount[lastName] === 1) { result[draftName] = espnByLast[lastName].data; return; }
    // 2b. Ambiguous last name — try matching first name too
    if (espnLastNameCount[lastName] > 1) {
      const firstName = lower.split(' ')[0];
      const ambigMatch = Object.entries(espnByFull).find(([k]) => {
        const parts = k.split(' ');
        return parts[parts.length-1] === lastName && parts[0] === firstName;
      });
      if (ambigMatch) { result[draftName] = ambigMatch[1].data; return; }
    }
    // 3. Try matching with/without Jr. / II etc.
    const stripped = lower.replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '').trim();
    const match = Object.keys(espnByFull).find(k => k.replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i,'').trim() === stripped);
    if (match) { result[draftName] = espnByFull[match].data; return; }
  });
  // Also keep original ESPN names so any exact matches in future still work
  Object.entries(espnPlayers).forEach(([name, data]) => {
    if (!result[name]) result[name] = data;
  });
  return result;
};

window.setEspnId = async function() {
  const val = document.getElementById('espn-id-input')?.value?.trim();
  if (!val) return;
  // Save to Firebase first so refreshScores can read it
  await update(liveRef(), { espnEventId: val });
  // Tell proxy too (best-effort, don't block)
  proxyApi('/eventid', 'POST', { eventId: val }).catch(() => {});
  // Immediately try a refresh so commissioner sees feedback
  await window.refreshScores(val);
};

// ── Sub window ─────────────────────────────────────────────────────
window.setRound = async function(r) {
  await update(liveRef(), { round: r });
};

window.toggleSubR1 = async function() {
  if (live.subWindowOpen && live.subWindowRound === 1) {
    await update(liveRef(), { subWindowOpen: false });
  } else {
    await update(liveRef(), { subWindowOpen: true, subWindowRound: 1 });
  }
};
window.toggleSubR2 = async function() {
  if (live.subWindowOpen && live.subWindowRound === 2) {
    await update(liveRef(), { subWindowOpen: false });
  } else {
    await update(liveRef(), { subWindowOpen: true, subWindowRound: 2 });
  }
};

// ── Sub flow ───────────────────────────────────────────────────────
window.openSubModal = function(owner) {
  subOwner = owner; subSwapOut = null;
  const picks = draft?.picks?.[owner] || { golfers: [] };
  const subRound = live?.subWindowRound || 1;
  const altName = picks.alternate?.name;
  document.getElementById('sub-modal-sub').textContent =
    `${owner} · After Round ${subRound} · $${subRound===1?5:15} added to pot`;
  document.getElementById('sub-swap-out-list').innerHTML = picks.golfers
    .filter(g => !g.subOut)
    .map(g => {
      const sv = live?.scores?.[g.name]?.display || '—';
      return `<div class="golfer-option" onclick="window.selectSwapOut('${g.name.replace(/'/g,"\\'")}')">
        <span style="font-weight:600;">${g.name}</span><span style="color:#888;font-size:11px;">${sv}</span>
      </div>`;
    }).join('');
  document.getElementById('sub-step-1').style.display = '';
  document.getElementById('sub-step-2').style.display = 'none';
  document.getElementById('sub-modal').style.display = 'flex';
};

window.selectSwapOut = function(name) {
  subSwapOut = name;
  const alt = draft?.picks?.[subOwner]?.alternate;
  document.getElementById('sub-alt-display').textContent = alt?.name || '—';
  document.getElementById('sub-confirm-out').textContent = name;
  document.getElementById('sub-step-1').style.display = 'none';
  document.getElementById('sub-step-2').style.display = '';
};

window.confirmSub = async function() {
  if (!subOwner || !subSwapOut) return;
  const alt = draft?.picks?.[subOwner]?.alternate;
  if (!alt) return;
  const subRound = live?.subWindowRound || 1;
  const cost = subRound === 1 ? 5 : 15;
  const newSub = { owner: subOwner, from: subSwapOut, to: alt.name, round: subRound, cost, ts: new Date().toISOString() };
  const existingSubs = Array.isArray(live?.subs) ? live.subs : Object.values(live?.subs || {});
  await update(liveRef(), { subs: [...existingSubs, newSub], pot: (live?.pot||0) + cost });
  document.getElementById('sub-modal').style.display = 'none';
  showToast(`✓ ${alt.name} subbed in for ${subOwner} (+$${cost})`);
  subOwner = null; subSwapOut = null;
};

// ── Finalize ───────────────────────────────────────────────────────
window.openFinalize = function() {
  const lbData = buildLeaderboard();
  const winner = lbData.find(e => !e.out);
  const summaryHtml = lbData.map((e, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #f0f0f0;">
      <span style="color:${color(e.owner)};font-weight:700;">${i===0&&!e.out?'🏆 ':''}${e.owner}</span>
      <span style="font-weight:700;color:${e.out?'#aaa':e.teamScore<0?'#2e7d32':e.teamScore>0?'#c62828':'#1a1a1a'}">${e.out?'OUT':fmtScore(e.teamScore)}</span>
    </div>`).join('');
  document.getElementById('finalize-summary').innerHTML = summaryHtml;
  document.getElementById('finalize-modal').style.display = 'flex';
};

window.doFinalize = async function() {
  const lbData = buildLeaderboard();
  const winner = lbData.find(e => !e.out)?.owner || '';
  const subs = Array.isArray(live?.subs) ? live.subs : Object.values(live?.subs || {});
  const ownersData = {};
  owners().forEach(owner => {
    const entry = lbData.find(e => e.owner === owner);
    const picks = draft?.picks?.[owner] || { golfers: [], alternate: null };
    const ownerSub = subs.find(s => s.owner === owner);
    const golfers = picks.golfers.map(g => {
      const ls = live?.scores?.[g.name];
      const isSubOut = ownerSub?.from === g.name;
      return { name: g.name, ...(isSubOut?{subOut:true}:{}), ...(ls?.cut?{score:'CUT',cut:true}:{score:ls?.score??0}) };
    });
    if (ownerSub) {
      const altScore = live?.scores?.[ownerSub.to];
      golfers.push({ name: ownerSub.to, sub: true, ...(altScore?.cut?{score:'CUT',cut:true}:{score:altScore?.score??0}) });
    }
    const altName = picks.alternate?.name;
    const altLive = live?.scores?.[altName];
    const alternate = { name: altName, ...(altLive?.cut?{score:'CUT',cut:true}:{score:altLive?.score??0}), ...(ownerSub?{subOut:true}:{}) };
    ownersData[owner] = { golfers, alternate, score: entry?.out?'OUT':(entry?.teamScore??0) };
  });
  const entry = { slug:SLUG, name:draft?.name||SLUG, year:new Date().getFullYear(), pot:live?.pot||(owners().length*25), winner, owners:ownersData };
  await set(histRef(), entry);
  await update(draftRef(), { status: 'final' });
  await update(liveRef(), { committedAt: new Date().toISOString() });
  document.getElementById('finalize-modal').style.display = 'none';
  alert('Tournament committed to history ✅');
};

window.undoFinalize = async function() {
  if (!confirm('Undo Finalize? This sets the tournament back to Live.')) return;
  await update(draftRef(), { status: 'live' });
};

window.undoCommit = async function() {
  if (!confirm('Undo the history commit? This will remove the entry from history and set the tournament back to "final" (not yet committed).')) return;
  await set(histRef(), null);
  await update(draftRef(), { status: 'final' });
  await update(liveRef(), { committedAt: null });
};
window.doReset = async function() {
  document.getElementById('reset-modal').style.display = 'none';
  clearInterval(timerInterval); timerInterval = null;
  // score refresh handled server-side
  ws?.close(); ws = null;
  await fetch(`${PROXY}/golf/${SLUG}/reset`, { method:'POST', headers:{'Content-Type':'application/json'} });
  await set(draftRef(), { slug:SLUG, name:'', status:'setup', field:[], autopickList:[], owners:ALL_OWNERS, picks:{}, currentPickIndex:0, currentPhase:'main', pickSequence:[], altSequence:[], pot:ALL_OWNERS.length*25, timerStart:null, timerDuration:7200, locked:false, undoStack:[], redoStack:[], makeupPicks:{} });
  await set(liveRef(), null);
};

// ── Odds ───────────────────────────────────────────────────────────
function showOddsResult(data) {
  const unmatchedHtml = (data.unmatched||[]).map(p => `
    <div style="margin-bottom:10px;">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${p.name}</div>
      <div style="display:flex;gap:6px;">
        <select id="sel-${p.name.replace(/\s/g,'_')}" style="flex:1;border:1px solid #ddd;border-radius:5px;padding:4px 8px;font-size:12px;">
          <option value="">-- no match --</option>
          ${(data.availableOdds||[]).map(o=>`<option value="${o.name}">${o.name} (DK:${o.dk||'—'} FD:${o.fd||'—'})</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-green" onclick="window.applyOdds('${p.name.replace(/'/g,"\\'")}','${p.name.replace(/\s/g,'_')}')">Apply</button>
      </div>
    </div>`).join('');
  document.getElementById('odds-content').innerHTML =
    `${data.seeded ? '<p style="font-size:11px;color:#888;margin-bottom:8px;">📌 Using seeded Masters 2026 pre-tournament odds</p>' : ''}
    <p style="margin-bottom:12px;"><span style="color:#2e7d32;font-weight:600;">${data.matched} matched</span>${data.unmatched?.length?` · <span style="color:#c62828;font-weight:600;">${data.unmatched.length} unmatched</span>`:''}</p>
    ${unmatchedHtml}
    <button class="btn btn-outline btn-sm" style="margin-top:12px;width:100%;" onclick="document.getElementById('odds-modal').style.display='none'">Done</button>`;
}

window.importOdds = async function() {
  document.getElementById('odds-content').innerHTML = '<p style="color:#888;">Fetching live odds…</p>';
  document.getElementById('odds-modal').style.display = 'flex';
  try {
    const data = await proxyApi('/odds', 'POST');
    if (data.error) {
      document.getElementById('odds-content').innerHTML =
        `<p style="color:#c62828;">${data.error}</p>
        <p style="font-size:12px;color:#888;margin-top:8px;">No live odds available — try seeding Masters 2026 odds instead.</p>
        <button class="btn btn-amber btn-sm" style="margin-top:10px;" onclick="window.seedOdds()">Seed Masters 2026 Odds</button>
        <button class="btn btn-outline btn-sm" style="margin-top:8px;display:block;" onclick="document.getElementById('odds-modal').style.display='none'">Close</button>`;
      return;
    }
    showOddsResult(data);
  } catch(e) {
    document.getElementById('odds-content').innerHTML = `<p style="color:#c62828;">Error: ${e.message}</p><button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="document.getElementById('odds-modal').style.display='none'">Close</button>`;
  }
};

window.seedOdds = async function() {
  document.getElementById('odds-content').innerHTML = '<p style="color:#888;">Seeding Masters 2026 odds…</p>';
  document.getElementById('odds-modal').style.display = 'flex';
  try {
    const data = await proxyApi('/odds/seed', 'POST');
    showOddsResult(data);
  } catch(e) {
    document.getElementById('odds-content').innerHTML = `<p style="color:#c62828;">Error: ${e.message}</p><button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="document.getElementById('odds-modal').style.display='none'">Close</button>`;
  }
};
window.applyOdds = async function(fieldName, selId) {
  const sel = document.getElementById('sel-'+selId);
  if (!sel?.value) return;
  await proxyApi('/odds/manual', 'POST', { fieldName, oddsName: sel.value });
  sel.closest('div').style.opacity = '0.4';
};

// ── Password gates ─────────────────────────────────────────────────
const PW_KEY = 'srb_auth';
(function() {
  if (sessionStorage.getItem(PW_KEY) !== 'ok') {
    document.getElementById('pw-gate').classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('pw-input').focus(), 50);
  }
})();
window.pwCheck = function() {
  const val = document.getElementById('pw-input').value.trim().toLowerCase();
  if (val === PW_MAIN.toLowerCase()) {
    sessionStorage.setItem(PW_KEY, 'ok');
    document.getElementById('pw-gate').classList.remove('show');
    document.body.style.overflow = '';
  } else {
    document.getElementById('pw-error').textContent = 'Wrong password.';
    document.getElementById('pw-input').value = '';
    setTimeout(() => { document.getElementById('pw-error').textContent = ''; }, 2000);
  }
};

// ── Feedback ───────────────────────────────────────────────────────
window.openFeedback = function() { document.getElementById('fb-overlay').classList.add('open'); document.body.style.overflow = 'hidden'; };
window.closeFeedback = function() { document.getElementById('fb-overlay').classList.remove('open'); document.body.style.overflow = ''; };
window.fbClose = function(e) { if (e.target === document.getElementById('fb-overlay')) window.closeFeedback(); };
window.fbSubmit = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('fb-submit-btn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const res = await fetch('https://formspree.io/f/' + FORMSPREE_ID, { method:'POST', body: new FormData(e.target), headers:{Accept:'application/json'} });
    if (res.ok) { window.closeFeedback(); e.target.reset(); }
  } catch {}
  btn.disabled = false; btn.textContent = 'Send →';
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') { window.closeFeedback(); document.getElementById('sub-modal').style.display='none'; document.getElementById('makeup-modal').style.display='none'; } });
</script>
</body>
</html>
