const $ = s => document.querySelector(s);
const notice = msg => { $('#notice').textContent = msg; window.scrollTo({top:0,behavior:'smooth'}); };
async function api(url, options={}) {
  const res = await fetch(url,{headers:{'Content-Type':'application/json'},...options});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
const body = form => Object.fromEntries(new FormData(form).entries());
async function refresh() {
  const [events,me] = await Promise.all([api('/api/events'),api('/api/me')]);
  const user=me.user;
  $('#userLabel').textContent=user ? `Hi, ${user.name}` : '';
  $('#logoutBtn').hidden=!user; $('#myLink').hidden=!user;
  $('#adminLink').hidden=user?.role!=='admin'; $('#auth').hidden=!!user;
  $('#my-events').hidden=!user; $('#admin').hidden=user?.role!=='admin';
  $('#eventList').innerHTML=events.map(e=>`<article class="event-card"><div class="date">${new Date(e.event_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'2-digit',year:'numeric'}).toUpperCase()}</div><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.description)}</p><div class="event-meta">⌖ ${escapeHtml(e.venue)} · ${e.registered}/${e.capacity} seats</div><button class="button" data-register="${e.id}">Register for event</button></article>`).join('');
  if(user) {
    const mine=await api('/api/my-registrations');
    $('#myList').innerHTML=mine.length?mine.map(e=>`<article class="event-card"><div class="date">CONFIRMED</div><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.description)}</p><div class="event-meta">${escapeHtml(e.event_date)} · ${escapeHtml(e.venue)}</div></article>`).join(''):'<p class="muted">You have not registered for any events yet.</p>';
  }
  if(user?.role==='admin') {
    const rows=await api('/api/admin/participants');
    $('#participants').innerHTML=rows.map(r=>`<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.event_title)}</td></tr>`).join('')||'<tr><td colspan="3">No registrations yet.</td></tr>';
  }
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('#registerForm').addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/api/register',{method:'POST',body:JSON.stringify(body(e.target))});e.target.reset();await refresh();notice(r.message);}catch(err){notice(err.message);}});
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/api/login',{method:'POST',body:JSON.stringify(body(e.target))});e.target.reset();await refresh();notice(r.message);}catch(err){notice(err.message);}});
$('#logoutBtn').addEventListener('click',async()=>{await api('/api/logout',{method:'POST'});await refresh();notice('Logged out successfully.');});
$('#eventList').addEventListener('click',async e=>{const id=e.target.dataset.register;if(!id)return;try{const r=await api(`/api/events/${id}/register`,{method:'POST'});await refresh();notice(r.message);}catch(err){notice(err.message);}});
$('#eventForm').addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/api/admin/events',{method:'POST',body:JSON.stringify(body(e.target))});e.target.reset();await refresh();notice(r.message);}catch(err){notice(err.message);}});
refresh().catch(err=>notice(err.message));