export function staffSignupRecord(signup) {
  return {
    signupId: signup.signupId,
    displayId: signup.displayId,
    displayNumber: signup.displayNumber,
    firstName: signup.firstName,
    lastName: signup.lastName || '',
    email: signup.email || '',
    phone: signup.phone || '',
    status: signup.status,
    createdAt: signup.createdAt,
    confirmedAt: signup.confirmedAt || null,
    confirmedByStaff: signup.confirmedByStaff || null,
    confirmedByKiosk: signup.confirmedByKiosk || null,
    deniedAt: signup.deniedAt || null,
    deniedByStaff: signup.deniedByStaff || null,
    deniedByKiosk: signup.deniedByKiosk || null,
    eventId: signup.eventId || null,
  };
}

export function staffMonitorPageHtml(eventIds) {
  const ids = Array.isArray(eventIds) ? eventIds : [eventIds].filter(Boolean);
  const primaryEventId = ids[0] || '';
  const eventIdParam = ids.length > 0 ? ids.join(',') : '';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/>
<title>GŪDESSENCE Staff Queue</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(160deg,#0a0a0c,#1a0a2e);color:#fff;padding:16px;padding-bottom:88px}
h1{color:#ccff00;font-size:1.25rem;margin:0 0 6px}
h2{font-size:.95rem;margin:16px 0 10px;color:#ccff00;letter-spacing:.5px}
.sub{opacity:.7;font-size:.85rem;margin-bottom:16px;line-height:1.45}
.tabs{display:flex;gap:8px;margin-bottom:16px}
.tab{flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:#fff;font-weight:600;font-size:.9rem;cursor:pointer}
.tab.active{border-color:#ccff00;background:rgba(204,255,0,.12);color:#ccff00}
.view-hidden{display:none!important}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.toolbar input{flex:1;min-width:160px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:16px}
.btn-copy{padding:14px 16px;border-radius:10px;border:1px solid rgba(204,255,0,.45);background:rgba(204,255,0,.08);color:#ccff00;font-weight:600;font-size:.85rem;cursor:pointer;white-space:nowrap}
.btn-copy:active{transform:scale(.98)}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.stat{flex:1;min-width:72px;padding:10px 8px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);text-align:center}
.stat strong{display:block;font-size:1.05rem;color:#ccff00}
.stat span{font-size:.65rem;opacity:.65;text-transform:uppercase;letter-spacing:.4px}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(204,255,0,.28);border-radius:14px;padding:16px;margin-bottom:12px}
.card.approved{border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.06)}
.id-tag{font-family:ui-monospace,monospace;color:#ccff00;font-size:.9rem;margin-bottom:4px}
.card.approved .id-tag{color:#4ade80}
.meta{font-size:.85rem;opacity:.8;margin-top:8px;line-height:1.5;word-break:break-word}
.badge{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:999px;font-size:.72rem;font-weight:bold}
.badge.pending{background:rgba(255,0,127,.15);color:#ff007f}
.badge.approved{background:rgba(34,197,94,.2);color:#22c55e}
.actions{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.btn-approve,.btn-decline{width:100%;padding:16px;border-radius:10px;font-weight:bold;font-size:1rem;cursor:pointer;touch-action:manipulation}
.btn-approve{border:none;background:#ccff00;color:#000}
.btn-decline{border:2px solid #ff6b6b;background:rgba(255,80,80,.18);color:#ff8a8a}
.btn-approve:active,.btn-decline:active{transform:scale(.98)}
.btn-approve:disabled,.btn-decline:disabled{opacity:.45;pointer-events:none}
.btn-cancel{width:100%;margin-top:8px;padding:12px;border:1px solid rgba(255,255,255,.25);border-radius:10px;background:transparent;color:#fff;font-size:.95rem;cursor:pointer}
.confirm-box{margin-top:12px;padding:12px;border-radius:10px;background:rgba(255,0,127,.08);border:1px solid rgba(255,0,127,.35)}
.confirm-box.decline{background:rgba(255,80,80,.08);border-color:rgba(255,80,80,.35)}
.empty{text-align:center;opacity:.5;padding:24px 12px;font-size:.9rem}
.count{float:right;font-size:.8rem;opacity:.65;font-weight:normal}
.history-controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.history-controls select{flex:1;min-width:140px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:.9rem;font-weight:600;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23ccff00' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
.history-controls select option{background:#1a0a2e;color:#fff}
.history-list{border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.02)}
.history-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;touch-action:manipulation;transition:background .15s}
.history-row:last-child{border-bottom:none}
.history-row:active,.history-row:focus-visible{background:rgba(204,255,0,.08);outline:none}
.history-row.approved{border-left:3px solid rgba(34,197,94,.7)}
.history-row.declined{border-left:3px solid rgba(255,80,80,.55);opacity:.92}
.history-row-main{flex:1;min-width:0}
.history-row-name{font-weight:600;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.history-row-sub{font-size:.75rem;opacity:.65;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.history-row-meta{text-align:right;flex-shrink:0}
.history-row-time{font-size:.72rem;opacity:.6;white-space:nowrap}
.history-row-chevron{font-size:.85rem;opacity:.35;margin-left:4px}
.history-pagination{text-align:center;padding:14px 12px;border-top:1px solid rgba(255,255,255,.08)}
.history-pagination .btn-more{width:100%;padding:14px;border-radius:10px;border:1px solid rgba(204,255,0,.35);background:rgba(204,255,0,.06);color:#ccff00;font-weight:600;font-size:.9rem;cursor:pointer}
.history-pagination .btn-more:active{transform:scale(.98)}
.history-showing{font-size:.75rem;opacity:.55;margin-bottom:10px}
.detail-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:10;display:flex;align-items:flex-end;justify-content:center;padding:0}
.detail-overlay.view-hidden{display:none!important}
.detail-sheet{width:100%;max-width:520px;max-height:88vh;overflow-y:auto;background:linear-gradient(180deg,#1a0a2e,#0a0a0c);border:1px solid rgba(204,255,0,.35);border-radius:18px 18px 0 0;padding:20px 18px 28px;animation:slideUp .22s ease-out}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.detail-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.detail-header h3{margin:0;font-size:1.1rem;color:#fff;line-height:1.3}
.detail-close{width:40px;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:1.4rem;line-height:1;cursor:pointer;flex-shrink:0}
.detail-field{margin-bottom:14px}
.detail-label{font-size:.68rem;text-transform:uppercase;letter-spacing:.5px;opacity:.55;margin-bottom:4px}
.detail-value{font-size:.95rem;word-break:break-word;line-height:1.45}
.detail-value.mono{font-family:ui-monospace,monospace;color:#ccff00}
.detail-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1)}
.detail-actions button{flex:1;min-width:120px;padding:12px;border-radius:10px;border:1px solid rgba(204,255,0,.4);background:rgba(204,255,0,.08);color:#ccff00;font-weight:600;font-size:.85rem;cursor:pointer}
.refresh{position:fixed;bottom:16px;right:16px;width:52px;height:52px;border-radius:50%;border:none;background:#ccff00;color:#000;font-size:1.4rem;cursor:pointer;z-index:2}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:rgba(34,197,94,.92);color:#000;font-weight:600;font-size:.85rem;opacity:0;pointer-events:none;transition:opacity .25s;z-index:3;max-width:90vw;text-align:center}
.toast.show{opacity:1}
.toast.error{background:rgba(255,80,80,.92);color:#fff}
</style></head><body>
<h1>Staff QR Queue</h1>
<p class="sub">Approve to save guest data, or decline to remove from queue. All records stay in History.</p>
<p class="sub" id="eventInfo"></p>
<p class="sub" style="margin-top:4px;font-size:.78rem" id="multiEventInfo"></p>
<div class="stats">
  <div class="stat"><strong id="statPending">0</strong><span>Pending</span></div>
  <div class="stat"><strong id="statApproved">0</strong><span>Approved</span></div>
  <div class="stat"><strong id="statTotal">0</strong><span>Total</span></div>
</div>
<div class="tabs">
  <button type="button" class="tab active" id="tabQueue" data-tab="queue">Queue</button>
  <button type="button" class="tab" id="tabHistory" data-tab="history">History</button>
</div>
<div class="toolbar" style="margin-bottom:12px">
  <input id="searchQuery" type="search" placeholder="Search name, email, phone, or ID (e.g. CND-00007)" autocomplete="off" enterkeyhint="search" />
</div>
<div id="viewQueue">
  <input id="staffName" placeholder="Your name (optional)" autocomplete="name" maxlength="40" style="width:100%;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:16px;margin-bottom:12px" />
  <input id="staffPin" type="password" placeholder="Staff PIN (if required)" autocomplete="off" maxlength="20" style="width:100%;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:16px;margin-bottom:12px" />
  <h2>Pending <span class="count" id="pendingCount">0</span></h2>
  <div id="pendingList"><div class="empty">Loading…</div></div>
</div>
<div id="viewHistory" class="view-hidden">
  <div class="toolbar">
    <button type="button" class="btn-copy" id="btnCopy">Copy all signups</button>
    <button type="button" class="btn-copy" id="btnDownload">Download JSON</button>
  </div>
  <div class="history-controls">
    <select id="historyFilter" aria-label="Filter history">
      <option value="all">All history</option>
      <option value="confirmed">Approved only</option>
      <option value="denied">Declined only</option>
    </select>
    <select id="historySort" aria-label="Sort history">
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
    </select>
  </div>
  <h2>History <span class="count" id="historyCount">0</span></h2>
  <div id="historyList"><div class="empty">Loading…</div></div>
</div>
<button type="button" class="refresh" id="btnRefresh" title="Refresh">↻</button>
<div id="historyDetail" class="detail-overlay view-hidden" aria-hidden="true">
  <div class="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
    <div class="detail-header">
      <h3 id="detailTitle">Guest details</h3>
      <button type="button" class="detail-close" id="detailClose" aria-label="Close">×</button>
    </div>
    <div id="historyDetailBody"></div>
  </div>
</div>
<div id="toast" class="toast"></div>
<script>
const EVENT_IDS=${JSON.stringify(ids)};
const PRIMARY_EVENT_ID=${JSON.stringify(primaryEventId)};
const IS_MULTI=ids.length>1;
let confirmSignupId=null;
let confirmAction=null;
let activeView='queue';
let allSignups=[];
let searchQuery='';
let actionBusy=false;
let historyFilter='all';
let historySort='newest';
let historyVisibleCount=50;
let selectedHistoryId=null;
const HISTORY_PAGE_SIZE=50;

function historyActionTime(s){
  if(s.status==='confirmed')return s.confirmedAt||s.createdAt;
  return s.deniedAt||s.createdAt;
}
function buildHistoryList(rows){
  let list=rows.filter(s=>s.status==='confirmed'||s.status==='denied');
  if(historyFilter!=='all')list=list.filter(s=>s.status===historyFilter);
  list.sort((a,b)=>{
    const diff=new Date(historyActionTime(a))-new Date(historyActionTime(b));
    return historySort==='newest'?-diff:diff;
  });
  return list;
}
function openHistoryDetail(signupId){
  selectedHistoryId=signupId;
  const overlay=document.getElementById('historyDetail');
  overlay.classList.remove('view-hidden');
  overlay.setAttribute('aria-hidden','false');
  renderHistoryDetail(signupId);
}
function closeHistoryDetail(){
  selectedHistoryId=null;
  const overlay=document.getElementById('historyDetail');
  overlay.classList.add('view-hidden');
  overlay.setAttribute('aria-hidden','true');
}
function detailField(label,value,mono){
  if(!value)return '';
  return '<div class="detail-field"><div class="detail-label">'+esc(label)+'</div>'
    +'<div class="detail-value'+(mono?' mono':'')+'">'+esc(value)+'</div></div>';
}
function renderHistoryDetail(signupId){
  const s=allSignups.find(x=>x.signupId===signupId);
  const body=document.getElementById('historyDetailBody');
  const title=document.getElementById('detailTitle');
  if(!s){body.innerHTML='<div class="empty">Record not found</div>';return;}
  const isApproved=s.status==='confirmed';
  const name=((s.firstName||'')+' '+(s.lastName||'')).trim()||'Guest';
  title.textContent=name;
  const staffLine=isApproved&&s.confirmedByStaff
    ?'Approved by '+s.confirmedByStaff+(s.confirmedByKiosk?' via '+s.confirmedByKiosk:'')
    :(!isApproved&&s.deniedByStaff?'Declined by '+s.deniedByStaff+(s.deniedByKiosk?' via '+s.deniedByKiosk:''):'');
  const badge=isApproved
    ?'<span class="badge approved">APPROVED</span>'
    :'<span class="badge" style="background:rgba(255,80,80,.15);color:#ff6b6b">DECLINED</span>';
  body.innerHTML=badge
    +detailField('Display ID',s.displayId,true)
    +detailField('Signup ID',s.signupId,true)
    +detailField('First name',s.firstName)
    +detailField('Last name',s.lastName)
    +detailField('Email',s.email)
    +detailField('Phone',s.phone)
    +detailField('Submitted',fmtTime(s.createdAt))
    +(isApproved&&s.confirmedAt?detailField('Approved',fmtTime(s.confirmedAt)):'')
    +(!isApproved&&s.deniedAt?detailField('Declined',fmtTime(s.deniedAt)):'')
    +(staffLine?detailField('Staff action',staffLine):'')
    +'<div class="detail-actions">'
    +'<button type="button" data-copy-field="email">Copy email</button>'
    +'<button type="button" data-copy-field="phone">Copy phone</button>'
    +'<button type="button" data-copy-field="id">Copy ID</button>'
    +'</div>';
  body.querySelector('[data-copy-field="email"]')?.addEventListener('click',()=>copyText(s.email||'','Email'));
  body.querySelector('[data-copy-field="phone"]')?.addEventListener('click',()=>copyText(s.phone||'','Phone'));
  body.querySelector('[data-copy-field="id"]')?.addEventListener('click',()=>copyText(s.displayId||s.signupId||'','ID'));
}
async function copyText(text,label){
  if(!text){showToast('No '+label.toLowerCase()+' on file',true);return;}
  try{await navigator.clipboard.writeText(text);showToast(label+' copied');}
  catch(_){
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);showToast(label+' copied');
  }
}

function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function eventBadge(eventId){
  if(!eventId)return'';
  if(String(eventId).includes('colombia'))return' 🇨🇴';
  if(String(eventId).includes('cannadelic'))return' 🍿';
  return'';
}
function eventLabel(eventId){
  if(!eventId)return'';
  if(String(eventId).includes('colombia'))return'Colombia';
  if(String(eventId).includes('cannadelic'))return'Cannadelic';
  return eventId;
}
function matchesSearch(s){
  const q=searchQuery.trim().toLowerCase();
  if(!q)return true;
  const digits=q.replace(/\D/g,'');
  const hay=[
    s.displayId||'',
    s.firstName||'',
    s.lastName||'',
    s.email||'',
    s.phone||'',
    (s.firstName||'')+' '+(s.lastName||''),
  ].join(' ').toLowerCase();
  if(hay.includes(q))return true;
  if(digits){
    const phoneDigits=String(s.phone||'').replace(/\\D/g,'');
    if(phoneDigits.includes(digits))return true;
  }
  return false;
}
function fmtTime(iso){
  if(!iso)return '—';
  try{return new Date(iso).toLocaleString(undefined,{dateStyle:'short',timeStyle:'short'});}
  catch{return iso;}
}
function showToast(msg,isError){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.toggle('error',!!isError);
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2400);
}
function pendingRows(){
  return allSignups.filter(s=>s.status==='pending'&&matchesSearch(s));
}
function rerender(){
  if(activeView==='queue')renderPending(pendingRows());
  else renderHistory(allSignups.filter(matchesSearch));
}
function switchView(view){
  activeView=view;
  document.getElementById('tabQueue').classList.toggle('active',view==='queue');
  document.getElementById('tabHistory').classList.toggle('active',view==='history');
  document.getElementById('viewQueue').classList.toggle('view-hidden',view!=='queue');
  document.getElementById('viewHistory').classList.toggle('view-hidden',view!=='history');
  confirmSignupId=null;
  confirmAction=null;
  rerender();
}
function startConfirm(signupId,action){
  if(actionBusy)return;
  confirmSignupId=signupId;
  confirmAction=action;
  renderPending(pendingRows());
}
function applyLocalAction(signupId,action,staffName){
  const idx=allSignups.findIndex(s=>s.signupId===signupId);
  if(idx<0)return;
  const now=new Date().toISOString();
  if(action==='deny'){
    allSignups[idx]={...allSignups[idx],status:'denied',deniedAt:now,deniedByStaff:staffName,deniedByKiosk:'Phone Staff Monitor'};
  }else{
    allSignups[idx]={...allSignups[idx],status:'confirmed',confirmedAt:now,confirmedByStaff:staffName,confirmedByKiosk:'Phone Staff Monitor'};
  }
  updateStats({
    pending:allSignups.filter(s=>s.status==='pending').length,
    confirmed:allSignups.filter(s=>s.status==='confirmed').length,
    total:allSignups.length,
  });
}
async function submitAction(){
  if(actionBusy||!confirmSignupId||!confirmAction)return;
  const staffName=document.getElementById('staffName').value.trim()||'Staff';
  const staffPin=document.getElementById('staffPin').value.trim()||'';
  const signupId=confirmSignupId;
  const action=confirmAction;
  const path=action==='deny'?'deny-staff':'approve-staff';
  actionBusy=true;
  document.querySelectorAll('.btn-approve,.btn-decline,.btn-cancel').forEach(b=>{b.disabled=true;});
  try{
    const res=await fetch('/api/signup/'+encodeURIComponent(signupId)+'/'+path,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({staffName,staffPin,confirmed:true}),
    });
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||(action==='deny'?'Decline failed':'Approve failed'));
    applyLocalAction(signupId,action,staffName);
    confirmSignupId=null;
    confirmAction=null;
    showToast(action==='deny'?'Declined — saved to history':'Approved — saved to history');
    rerender();
    load();
  }catch(e){
    showToast(e.message||'Action failed',true);
  }finally{
    actionBusy=false;
    document.querySelectorAll('.btn-approve,.btn-decline,.btn-cancel').forEach(b=>{b.disabled=false;});
  }
}
function renderPending(rows){
  const el=document.getElementById('pendingList');
  const totalPending=allSignups.filter(s=>s.status==='pending').length;
  document.getElementById('pendingCount').textContent=searchQuery.trim()?rows.length+' / '+totalPending:String(rows.length);
  if(!rows.length){
    el.innerHTML='<div class="empty">'+(searchQuery.trim()?'No pending signups match search':'No pending signups')+'</div>';
    confirmSignupId=null;
    confirmAction=null;
    return;
  }
  el.innerHTML=rows.map(s=>{
    const name=esc((s.firstName||'')+' '+(s.lastName||'')).trim();
    const confirming=confirmSignupId===s.signupId;
    const badge=eventBadge(s.eventId||EVENT_ID);
    const idTag=s.displayId?'<div class="id-tag">'+esc(s.displayId)+badge+'</div>':'<div class="id-tag" style="font-size:.75rem;opacity:.6">'+esc(s.eventId||'')+badge+'</div>';
    let actions='';
    if(confirming){
      const isDecline=confirmAction==='deny';
      actions='<div class="confirm-box'+(isDecline?' decline':'')+'">'
        +'<p><strong>Are you sure?</strong> '+(isDecline?'Decline':'Approve')+' <strong>'+name+'</strong>'
        +(s.displayId?' ('+esc(s.displayId)+')':'')+'?</p>'
        +'<button type="button" class="btn-approve" data-confirm-submit style="'+(isDecline?'background:#ff6b6b;color:#fff;border:none':'')+'">'
        +(isDecline?'Yes, decline &amp; save record':'Yes, approve &amp; save')+'</button>'
        +'<button type="button" class="btn-cancel" data-confirm-cancel>Cancel</button></div>';
    }else{
      actions='<div class="actions">'
        +'<button type="button" class="btn-approve" data-action="approve" data-signup-id="'+esc(s.signupId)+'">Approve</button>'
        +'<button type="button" class="btn-decline" data-action="deny" data-signup-id="'+esc(s.signupId)+'">Decline</button>'
        +'</div>';
    }
    return '<div class="card" data-signup-id="'+esc(s.signupId)+'">'+idTag
      +'<strong>'+name+'</strong><div class="meta">'
      +(s.email?'✉ '+esc(s.email)+'<br/>':'')
      +(s.phone?'☎ '+esc(s.phone)+'<br/>':'')
      +'<span class="badge pending">PENDING · '+fmtTime(s.createdAt)+'</span></div>'+actions+'</div>';
  }).join('');
}
function renderHistory(rows){
  const el=document.getElementById('historyList');
  const combined=buildHistoryList(rows);
  const totalApproved=allSignups.filter(s=>s.status==='confirmed').length;
  const totalDenied=allSignups.filter(s=>s.status==='denied').length;
  document.getElementById('historyCount').textContent=searchQuery.trim()||historyFilter!=='all'
    ?(combined.length+' shown · '+totalApproved+' approved · '+totalDenied+' declined')
    :(totalApproved+' approved · '+totalDenied+' declined');
  if(!combined.length){
    el.innerHTML='<div class="empty">'+(searchQuery.trim()||historyFilter!=='all'?'No history matches filters':'No approved or declined signups yet')+'</div>';
    return;
  }
  const visible=combined.slice(0,historyVisibleCount);
  const hasMore=visible.length<combined.length;
  const rowsHtml=visible.map(s=>{
    const isApproved=s.status==='confirmed';
    const name=esc((s.firstName||'')+' '+(s.lastName||'')).trim()||'Guest';
    const badge=eventBadge(s.eventId||EVENT_ID);
    const sub=(s.displayId?esc(s.displayId)+badge+' · ':esc(s.email||s.phone||'No ID'));
    const actionTime=historyActionTime(s);
    const badge=isApproved
      ?'<span class="badge approved">✓</span>'
      :'<span class="badge" style="background:rgba(255,80,80,.15);color:#ff6b6b;padding:4px 8px">✕</span>';
    return '<button type="button" class="history-row '+(isApproved?'approved':'declined')+'" data-history-id="'+esc(s.signupId)+'">'
      +'<div class="history-row-main"><div class="history-row-name">'+name+'</div>'
      +'<div class="history-row-sub">'+sub+'</div></div>'
      +'<div class="history-row-meta">'+badge
      +'<div class="history-row-time">'+fmtTime(actionTime)+'</div></div>'
      +'<span class="history-row-chevron" aria-hidden="true">›</span></button>';
  }).join('');
  const pagination=hasMore
    ?'<div class="history-pagination"><div class="history-showing">Showing '+visible.length+' of '+combined.length+'</div>'
      +'<button type="button" class="btn-more" id="btnHistoryMore">Load '+HISTORY_PAGE_SIZE+' more</button></div>'
    :'<div class="history-pagination"><div class="history-showing">Showing all '+combined.length+'</div></div>';
  el.innerHTML='<div class="history-list">'+rowsHtml+'</div>'+pagination;
  if(selectedHistoryId)renderHistoryDetail(selectedHistoryId);
}
function buildExportData(){
  return {
    eventId:EVENT_ID,
    exportedAt:new Date().toISOString(),
    total:allSignups.length,
    pending:allSignups.filter(s=>s.status==='pending').length,
    confirmed:allSignups.filter(s=>s.status==='confirmed').length,
    denied:allSignups.filter(s=>s.status==='denied').length,
    signups:allSignups,
  };
}
function updateStats(data){
  document.getElementById('statPending').textContent=String(data.pending||0);
  document.getElementById('statApproved').textContent=String(data.confirmed||0);
  document.getElementById('statTotal').textContent=String(data.total||0);
}
async function load(){
  try{
    let url='/api/signup/all/public';
    // Always load ALL signups — both booth and Colombia funnels unified into one queue
    if(EVENT_IDS.length>0){
      url+='?eventId='+EVENT_IDS.map(encodeURIComponent).join(',');
    }
    const res=await fetch(url,{cache:'no-store'});
    const data=await res.json();
    allSignups=data.signups||[];
    updateStats(data);
    const info=document.getElementById('multiEventInfo');
    if(IS_MULTI){
      const labels=allSignups.reduce((acc,s)=>{
        const l=eventLabel(s.eventId);
        if(!acc[l])acc[l]=0;
        acc[l]++;
        return acc;
      },{});
      info.textContent='Showing: '+Object.entries(labels).map(([l,n])=>l+' ('+n+')').join(' · ');
      info.style.display='';
    } else {
      info.style.display='none';
    }
    rerender();
  }catch(e){
    showToast('Could not refresh queue',true);
  }
}
document.getElementById('pendingList').addEventListener('click',function(e){
  const submitBtn=e.target.closest('[data-confirm-submit]');
  if(submitBtn){e.preventDefault();submitAction();return;}
  const cancelBtn=e.target.closest('[data-confirm-cancel]');
  if(cancelBtn){e.preventDefault();confirmSignupId=null;confirmAction=null;rerender();return;}
  const actionBtn=e.target.closest('[data-action]');
  if(!actionBtn||actionBusy)return;
  const signupId=actionBtn.getAttribute('data-signup-id');
  const action=actionBtn.getAttribute('data-action');
  if(!signupId||!action)return;
  startConfirm(signupId,action);
});
document.querySelectorAll('[data-tab]').forEach(function(tab){
  tab.addEventListener('click',function(){switchView(tab.getAttribute('data-tab'));});
});
document.getElementById('searchQuery').addEventListener('input',function(e){
  searchQuery=e.target.value||'';
  historyVisibleCount=HISTORY_PAGE_SIZE;
  rerender();
});
document.getElementById('historyFilter').addEventListener('change',function(e){
  historyFilter=e.target.value||'all';
  historyVisibleCount=HISTORY_PAGE_SIZE;
  rerender();
});
document.getElementById('historySort').addEventListener('change',function(e){
  historySort=e.target.value||'newest';
  rerender();
});
document.getElementById('historyList').addEventListener('click',function(e){
  const moreBtn=e.target.closest('#btnHistoryMore');
  if(moreBtn){
    historyVisibleCount+=HISTORY_PAGE_SIZE;
    rerender();
    return;
  }
  const row=e.target.closest('[data-history-id]');
  if(!row)return;
  openHistoryDetail(row.getAttribute('data-history-id'));
});
document.getElementById('detailClose').addEventListener('click',closeHistoryDetail);
document.getElementById('historyDetail').addEventListener('click',function(e){
  if(e.target===document.getElementById('historyDetail'))closeHistoryDetail();
});
document.getElementById('btnRefresh').addEventListener('click',load);
document.getElementById('btnCopy').addEventListener('click',async function(){
  const text=JSON.stringify(buildExportData(),null,2);
  try{
    await navigator.clipboard.writeText(text);
    showToast('All signups copied ('+allSignups.length+')');
  }catch(_){
    const ta=document.createElement('textarea');
    ta.value=text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('All signups copied ('+allSignups.length+')');
  }
});
document.getElementById('btnDownload').addEventListener('click',function(){
  const text=JSON.stringify(buildExportData(),null,2);
  const blob=new Blob([text],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='gudessence-signups-'+EVENT_ID+'-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Download started ('+allSignups.length+' records)');
});
load();
setInterval(load,2000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)load();});
window.addEventListener('focus',load);
</script></body></html>`;
}
