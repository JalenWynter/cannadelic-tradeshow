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
  };
}

export function staffMonitorPageHtml(eventId) {
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
.refresh{position:fixed;bottom:16px;right:16px;width:52px;height:52px;border-radius:50%;border:none;background:#ccff00;color:#000;font-size:1.4rem;cursor:pointer;z-index:2}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:rgba(34,197,94,.92);color:#000;font-weight:600;font-size:.85rem;opacity:0;pointer-events:none;transition:opacity .25s;z-index:3;max-width:90vw;text-align:center}
.toast.show{opacity:1}
.toast.error{background:rgba(255,80,80,.92);color:#fff}
</style></head><body>
<h1>Staff QR Queue</h1>
<p class="sub">Approve to save guest data, or decline to remove from queue. All records stay in History.</p>
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
  <h2>Pending <span class="count" id="pendingCount">0</span></h2>
  <div id="pendingList"><div class="empty">Loading…</div></div>
</div>
<div id="viewHistory" class="view-hidden">
  <div class="toolbar">
    <button type="button" class="btn-copy" id="btnCopy">Copy all signups</button>
    <button type="button" class="btn-copy" id="btnDownload">Download JSON</button>
  </div>
  <h2>History <span class="count" id="historyCount">0</span></h2>
  <div id="historyList"><div class="empty">Loading…</div></div>
</div>
<button type="button" class="refresh" id="btnRefresh" title="Refresh">↻</button>
<div id="toast" class="toast"></div>
<script>
const EVENT_ID=${JSON.stringify(eventId)};
let confirmSignupId=null;
let confirmAction=null;
let activeView='queue';
let allSignups=[];
let searchQuery='';
let actionBusy=false;

function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function matchesSearch(s){
  const q=searchQuery.trim().toLowerCase();
  if(!q)return true;
  const digits=q.replace(/\\D/g,'');
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
  const signupId=confirmSignupId;
  const action=confirmAction;
  const path=action==='deny'?'deny-staff':'approve-staff';
  actionBusy=true;
  document.querySelectorAll('.btn-approve,.btn-decline,.btn-cancel').forEach(b=>{b.disabled=true;});
  try{
    const res=await fetch('/api/signup/'+encodeURIComponent(signupId)+'/'+path,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({staffName,confirmed:true}),
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
    const idTag=s.displayId?'<div class="id-tag">'+esc(s.displayId)+'</div>':'';
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
  const approved=rows.filter(s=>s.status==='confirmed');
  const denied=rows.filter(s=>s.status==='denied');
  const combined=[...approved,...denied].sort((a,b)=>{
    const aTime=a.status==='confirmed'?a.confirmedAt:a.deniedAt||a.createdAt;
    const bTime=b.status==='confirmed'?b.confirmedAt:b.deniedAt||b.createdAt;
    return new Date(bTime)-new Date(aTime);
  });
  const totalApproved=allSignups.filter(s=>s.status==='confirmed').length;
  const totalDenied=allSignups.filter(s=>s.status==='denied').length;
  document.getElementById('historyCount').textContent=searchQuery.trim()
    ?(approved.length+' approved · '+denied.length+' declined (filtered)')
    :(totalApproved+' approved · '+totalDenied+' declined');
  if(!combined.length){
    el.innerHTML='<div class="empty">'+(searchQuery.trim()?'No history matches search':'No approved or declined signups yet')+'</div>';
    return;
  }
  el.innerHTML=combined.map(s=>{
    const isApproved=s.status==='confirmed';
    const name=esc((s.firstName||'')+' '+(s.lastName||'')).trim();
    const idTag=s.displayId?'<div class="id-tag">'+esc(s.displayId)+'</div>':'';
    const staffLine=isApproved&&s.confirmedByStaff?'Approved by '+esc(s.confirmedByStaff):'';
    const kioskLine=isApproved&&s.confirmedByKiosk?' via '+esc(s.confirmedByKiosk):'';
    const denyLine=!isApproved&&s.deniedByStaff?'Declined by '+esc(s.deniedByStaff):'';
    let timeLines='Submitted: '+fmtTime(s.createdAt);
    if(isApproved&&s.confirmedAt)timeLines+='<br/>Approved: '+fmtTime(s.confirmedAt);
    if(!isApproved&&s.deniedAt)timeLines+='<br/>Declined: '+fmtTime(s.deniedAt);
    if(staffLine)timeLines+='<br/>'+staffLine+kioskLine;
    if(denyLine)timeLines+='<br/>'+denyLine;
    const badge=isApproved
      ?'<span class="badge approved">APPROVED</span>'
      :'<span class="badge" style="background:rgba(255,80,80,.15);color:#ff6b6b">DECLINED</span>';
    return '<div class="card'+(isApproved?' approved':'')+'" style="'+(isApproved?'':'opacity:.85;border-color:rgba(255,80,80,.35)')+'">'+idTag
      +'<strong>'+name+'</strong><div class="meta">'
      +(s.email?'✉ '+esc(s.email)+'<br/>':'')
      +(s.phone?'☎ '+esc(s.phone)+'<br/>':'')
      +timeLines+'<br/>'+badge+'</div></div>';
  }).join('');
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
    const res=await fetch('/api/signup/all/public?eventId='+encodeURIComponent(EVENT_ID),{cache:'no-store'});
    const data=await res.json();
    allSignups=data.signups||[];
    updateStats(data);
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
  rerender();
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
