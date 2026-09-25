/* ==========================================================================
   Our Little Arcade — extras.js
   Daily quests & streaks, nudges, mood, lists, memory wall, love letters,
   together timer, trophies + Never Have I Ever, Two Truths, Couple Trivia,
   Quick Draw, Reversi, Draw & Guess.
   Uses globals from index.html: Net, Games, LS, esc, $, $$, toast, sfx, beep,
   confetti, floatEmoji, addLove, shuffle, rng, me, current, qaSess, ALLQ, QB
   ========================================================================== */
const uid=()=>Math.random().toString(36).slice(2,9);
const dayNum=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
const isVis=t=>!$('#hub').classList.contains('hidden')&&LS.get('lg_tab','today')===t;
function stat(k,n=1){const s=LS.get('lg_stats',{});s[k]=(s[k]||0)+n;LS.set('lg_stats',s)}
function stats(k){return (LS.get('lg_stats',{})[k])||0}
function ago(t){const m=Math.max(0,Math.round((Date.now()-t)/6e4));return m<1?'just now':m<60?m+'m ago':m<1440?Math.round(m/60)+'h ago':Math.round(m/1440)+'d ago'}
function fmtTime(ms){const s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}

/* ---------- days & streaks ---------- */
function markDay(){const d=LS.get('lg_days',[]),n=dayNum();if(!d.includes(n)){d.push(n);LS.set('lg_days',d.slice(-500))}}
function streak(){const d=new Set(LS.get('lg_days',[]));let n=dayNum();if(!d.has(n))n--;let s=0;while(d.has(n)){s++;n--}return s}

/* ---------- daily quests ---------- */
const QUESTS=[
  {k:'answer',e:'💬',t:"Answer today's question together"},
  {k:'nudge',e:'💌',t:'Send a little love (morning, night or a hug)'},
  {k:'play',e:'🎮',t:'Play a game together'},
  {k:'react',e:'💋',t:'Send a kiss or hug reaction'},
  {k:'create',e:'✨',t:'Add to your world (jar, list, photo, letter)'}];
const qKey=()=>'lg_q_'+dayNum();
function questState(){return LS.get(qKey(),{})}
/* quests are shared: when either of you completes one, it counts for both */
function quest(k,remote){const s=questState();if(s[k])return;s[k]=1;markDay();
  const all=QUESTS.every(q=>s[q.k]);
  if(all&&!s.all){s.all=1;stat('allq');if(!remote)setTimeout(()=>{confetti(140);sfx.win();toast('🎉 ALL daily quests done! +20 💗');addLove(20)},600)}
  LS.set(qKey(),s);
  if(remote)toast('✅ Quest done — together!');else{Net.send('qq',{k});addLove(3);toast('✅ Quest complete!')}
  if(isVis('today'))renderToday()}
Net.on('qq',d=>{if(QUESTS.some(q=>q.k===d.k))quest(d.k,true)});
const PLAYSET=new Set(['gwp','jar','scratch','fortune','ttt','c4','mem','bs','rps','hang','hc','flappy','g2048','snake','qd','reversi','trivia','dg','garden','wyr','nhie','ttl','tod']);

/* ---------- hooks: openGame, addLove, reactions ---------- */
const _og=openGame;
openGame=function(g,f){const p=LS.get('lg_played',[]);if(!p.includes(g)){p.push(g);LS.set('lg_played',p)}markDay();
  if(Net.connected&&PLAYSET.has(g))quest('play');_og(g,f)};
/* love points are ONE shared couple score: totals are synced (highest wins), never double-counted */
const _al=addLove;let _lpT;
addLove=function(n){_al(n);clearTimeout(_lpT);_lpT=setTimeout(()=>Net.send('lp',{t:loves()}),300);setTimeout(checkBadges,500)};
Net.on('lp',d=>{const t=+d.t;if(t>loves()){const diff=t-loves();LS.set('lg_love',t);renderLove();if(diff>0&&diff<=60)toast(`💗 +${diff} love points from ${Net.partner}!`);setTimeout(checkBadges,300)}});
Net.on('days',a=>{const d=LS.get('lg_days',[]);(Array.isArray(a)?a:[]).forEach(n=>{if(Number.isInteger(n)&&!d.includes(n))d.push(n)});LS.set('lg_days',d.sort((x,y)=>x-y).slice(-500));if(isVis('today'))renderToday()});
Net.on('bd',ids=>{const u=LS.get('lg_badges',[]);let fresh=null;(Array.isArray(ids)?ids:[]).forEach(id=>{const b=BADGES.find(x=>x.id===id);if(b&&!u.includes(id)){u.push(id);fresh=b}});
  if(fresh){LS.set('lg_badges',u);toast(`🏆 ${Net.partner} unlocked ${fresh.e} ${fresh.t} — it's yours too!`);sfx.win()}});
$$('#reactions button').forEach(b=>b.addEventListener('click',()=>quest('react')));
const _rh=renderHub;renderHub=function(){_rh();renderToday()};
function hubTab(t){if(t==='today')renderToday()}
if(Games.pet&&Games.pet.act){const _pa=Games.pet.act;Games.pet.act=function(k){stat('pet');return _pa.call(this,k)}}

/* ---------- Today tab ---------- */
const NUDGES=[
  {k:'morning',e:'🌅',t:'Good morning',m:'Good morning, my love! Hope your day is beautiful ☀️'},
  {k:'night',e:'🌙',t:'Good night',m:'Sleep tight… dream of us 🌙'},
  {k:'hug',e:'🫂',t:'Sending a hug',m:'Sending you the biggest hug through the screen 🫂'},
  {k:'miss',e:'🥺',t:'Miss you',m:'I miss you so much right now 🥺💗'},
  {k:'proud',e:'🌟',t:'Proud of you',m:"I'm SO proud of you! ⭐"},
  {k:'strong',e:'💪',t:'You got this',m:"You've got this. I believe in you! 💪"},
  {k:'call',e:'📞',t:'Call me?',m:'Call me when you can? I want to hear your voice 📞'},
  {k:'eat',e:'🍽️',t:'Eat & drink!',m:'Have you eaten and had some water? Take care of you 🥤'}];
const MOODS=['🥰','😊','😴','😔','😤','🤒','🎉','😰'];
function dailyId(){const ids=Object.keys(ALLQ).filter(k=>!k.startsWith('us-')).sort();return ids[(dayNum()*37+11)%ids.length]}
function startDaily(){const id=dailyId();qaSess={cat:'daily',order:[id],i:0};Net.send('qa-start',{cat:'daily',order:[id],us:[]});openGame('qa')}
function partnerClock(){const tz=LS.get('lg_ptz',null);if(!tz)return'';const d=new Date(Date.now()-tz.off*6e4),h=d.getUTCHours(),m=d.getUTCMinutes();
  return `🕐 ${Net.partner}'s time: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h<6||h>=22?'🌙':h<12?'🌅':h<18?'☀️':'🌇'}`}
function renderToday(){const box=$('#todayBox');if(!box)return;
  const qs=questState(),done=QUESTS.filter(q=>qs[q.k]).length,st=streak(),DQ=ALLQ[dailyId()];
  const mood=LS.get('lg_mood',null),pm=LS.get('lg_pmood',null),fresh=mood&&Date.now()-mood.t<864e5?mood.e:null;
  box.innerHTML=`
  <div class="panel"><div class="row" style="justify-content:space-between"><h3>🌟 Today's Love Quests</h3><span class="streak">🔥 ${st} day${st===1?'':'s'}</span></div>
    <div class="progress" style="margin:8px 0"><i style="width:${done/QUESTS.length*100}%"></i></div>
    ${QUESTS.map(q=>`<div class="quest ${qs[q.k]?'done':''}"><span class="ck">${qs[q.k]?'✓':''}</span><span class="qt">${q.e} ${q.t}</span>${qs[q.k]?'':`<button class="btn small ghost" data-go="${q.k}">Go</button>`}</div>`).join('')}
    <p class="note center">Finish all 5 for a +20 💗 bonus. Come back every day to grow your 🔥 streak!</p></div>
  <div class="panel"><h3>💬 Today's question</h3>
    <div class="qcard" style="margin:8px 0"><span class="cat">${QB[DQ.cat].emoji} ${QB[DQ.cat].name}</span><h2>${esc(DQ.q)}</h2></div>
    <div class="center"><button class="btn" id="dq-go">${qs.answer?'Talk about it again 💌':'Answer together 💌'}</button></div></div>
  <div class="panel"><h3>💌 Send a little love</h3><p class="note" style="margin:0">Pops up on their screen with a buzz. ${Net.connected?'':'(Connect first!)'}</p>
    <div class="nudges">${NUDGES.map(n=>`<button data-n="${n.k}"><b>${n.e}</b>${n.t}</button>`).join('')}</div></div>
  <div class="panel center"><h3>🌡️ How are you feeling today?</h3>
    <div class="moods">${MOODS.map(e=>`<button data-m="${e}" class="${fresh===e?'sel':''}">${e}</button>`).join('')}</div>
    <div class="moodline">${fresh?`<span>You: ${fresh}</span>`:''}${pm&&Net.connected!==undefined&&pm.e?`<span>${esc(Net.partner)}: ${pm.e} · ${ago(pm.t)}</span>`:''}${partnerClock()?`<span>${partnerClock()}</span>`:''}</div></div>`;
  $$('[data-go]',box).forEach(b=>b.onclick=()=>{const k=b.dataset.go;
    if(k==='answer')startDaily();else if(k==='nudge')$('.nudges',box).scrollIntoView({behavior:'smooth',block:'center'});
    else if(k==='play')showTab('play');else if(k==='react')toast('Tap an emoji on the bar at the bottom 💋');else showTab('together')});
  $('#dq-go').onclick=startDaily;
  $$('[data-n]',box).forEach(b=>b.onclick=()=>sendNudge(b.dataset.n));
  $$('[data-m]',box).forEach(b=>b.onclick=()=>{const m={e:b.dataset.m,t:Date.now()};LS.set('lg_mood',m);Net.send('mood',m);sfx.pop();renderToday()})}
function sendNudge(k){if(!Net.connected){toast('Connect with your love first 💞');return}
  const n=NUDGES.find(x=>x.k===k);Net.send('nudge',{k});floatEmoji(n.e);sfx.love();toast(`Sent: ${n.t} ${n.e}`);quest('nudge');addLove(1)}
Net.on('nudge',d=>{const n=NUDGES.find(x=>x.k===d.k);if(!n)return;sfx.love();vibe([80,40,80,40,120]);
  const old=$('#nudgeov');old&&old.remove();const el=document.createElement('div');el.id='nudgeov';
  el.innerHTML=`<div class="card"><span class="big">${n.e}</span><h2>${esc(Net.partner)} says…</h2><p style="font-size:20px">${esc(n.m)}</p>
    <div class="row" style="justify-content:center"><button class="btn" id="nv-back">Send 💗 back</button><button class="btn ghost" id="nv-x">Close</button></div></div>`;
  document.body.appendChild(el);confetti(40);
  $('#nv-x').onclick=()=>el.remove();$('#nv-back').onclick=()=>{Net.send('react','💗');floatEmoji('💗');el.remove()}});
Net.on('mood',m=>{LS.set('lg_pmood',m);if(isVis('today'))renderToday()});
Net.on('tz',d=>{LS.set('lg_ptz',d);if(isVis('today'))renderToday()});
setInterval(()=>{if(isVis('today'))renderToday()},60000);

/* ---------- connect hook: sync everything ---------- */
const _oc3=onConnected;
onConnected=function(){_oc3();
  Net.send('tz',{off:new Date().getTimezoneOffset()});const m=LS.get('lg_mood',null);m&&Net.send('mood',m);
  Net.send('lp',{t:loves()});Net.send('bd',LS.get('lg_badges',[]));Net.send('days',LS.get('lg_days',[]).slice(-120));
  Net.send('ls-sync',lsGet())};   // letters + wall are reconciled in sync.js (each side sends what the other is missing)

/* ---------- Our Lists ---------- */
const LCATS=[['watch','🎬','Watch'],['listen','🎵','Listen'],['visit','✈️','Visit'],['eat','🍽️','Eat & cook'],['bucket','✨','Bucket list']];
const LSTART={watch:['A rom-com marathon','A scary movie under blankets','A Studio Ghibli night','Watch the same show together','A documentary neither of us has seen'],
  listen:['Make a playlist of our songs','A podcast to share','Our first-dance song','Slow songs for sleepy calls','Swap our top 5 albums'],
  visit:['Paris 🥐','A beach at sunset','A cosy cabin','Disneyland','Where we first meet in person'],
  eat:['Homemade pizza night','Fancy dinner date','Bake cookies together','Try sushi','Cook each other\'s favourite meal'],
  bucket:['See the northern lights','Adopt a pet together','Dance in the rain','Write a song for us','Grow old together 🥹']};
function lsGet(){const d=LS.get('lg_lists',{});LCATS.forEach(([c])=>d[c]=d[c]||[]);return d}
const lsSave=d=>LS.set('lg_lists',d);
function lsMerge(inc){const d=lsGet();let n=0;LCATS.forEach(([c])=>(inc&&inc[c]||[]).forEach(x=>{if(!x||!/^[a-z0-9]{3,12}$/.test(x.id)||!x.t)return;
  const e=d[c].find(y=>y.id===x.id);if(!e){d[c].push({id:x.id,t:String(x.t).slice(0,120),d:!!x.d,by:x.by||''});n++}else if(x.d&&!e.d){e.d=true;n++}}));
  if(n){lsSave(d);if(current==='lists')Games.lists.render()}return n}
Net.on('ls-sync',d=>lsMerge(d));
Net.on('ls-add',d=>{const inc={};inc[d.c]=[d.item];if(lsMerge(inc))toast(`📝 ${Net.partner} added to Our Lists`)});
Net.on('ls-tog',d=>{const l=lsGet();const it=(l[d.c]||[]).find(x=>x.id===d.id);if(it){it.d=d.d;lsSave(l);if(current==='lists')Games.lists.render()}});
Net.on('ls-del',d=>{const l=lsGet();if(l[d.c]){l[d.c]=l[d.c].filter(x=>x.id!==d.id);lsSave(l);if(current==='lists')Games.lists.render()}});
Games.lists={title:'Our Lists 📝',cat:'watch',
  start(el){this.el=el;this.render()},
  render(){const el=this.el,l=lsGet(),c=this.cat,items=l[c],cur=LCATS.find(x=>x[0]===c);
    const have=new Set(items.map(x=>x.t));const sug=shuffle(LSTART[c].filter(s=>!have.has(s))).slice(0,3);
    el.innerHTML=`<div class="subtabs">${LCATS.map(([k,e,n])=>`<button data-c="${k}" class="${k===c?'sel':''}">${e} ${n} (${l[k].filter(x=>!x.d).length})</button>`).join('')}</div>
      <div class="row" style="flex-wrap:nowrap"><input id="li-t" maxlength="100" placeholder="Add to ${cur[2]}…"><button class="btn" id="li-a">Add</button></div>
      <div class="row" style="margin:8px 0">${sug.map(s=>`<button class="btn ghost small" data-s="${esc(s)}">💡 ${esc(s.slice(0,26))}${s.length>26?'…':''}</button>`).join('')}</div>
      ${items.filter(x=>!x.d).length?`<div class="center"><button class="btn mint small" id="li-r">🎲 Pick one for us!</button></div><div id="li-pick"></div>`:''}
      ${items.map(x=>`<div class="li ${x.d?'done':''}"><button class="ck" data-k="${x.id}">${x.d?'✓':''}</button><div class="t">${esc(x.t)}<small>${esc(x.by||'')}</small></div><button class="btn ghost small" data-d="${x.id}">✕</button></div>`).join('')||'<p class="note center">Nothing here yet — add your first idea! 🥰</p>'}`;
    $$('[data-c]',el).forEach(b=>b.onclick=()=>{this.cat=b.dataset.c;this.render()});
    const add=t=>{t=t.trim();if(!t)return;const item={id:uid(),t,d:false,by:me.name},d=lsGet();d[c].push(item);lsSave(d);Net.send('ls-add',{c,item});sfx.pop();addLove(1);quest('create');this.render()};
    $('#li-a').onclick=()=>add($('#li-t').value);$('#li-t').onkeydown=e=>{if(e.key==='Enter')add(e.target.value)};
    $$('[data-s]',el).forEach(b=>b.onclick=()=>add(b.dataset.s));
    $$('[data-k]',el).forEach(b=>b.onclick=()=>{const d=lsGet(),it=d[c].find(x=>x.id===b.dataset.k);it.d=!it.d;lsSave(d);Net.send('ls-tog',{c,id:it.id,d:it.d});
      if(it.d){sfx.win();confetti(40);addLove(2)}this.render()});
    $$('[data-d]',el).forEach(b=>b.onclick=()=>{const d=lsGet();d[c]=d[c].filter(x=>x.id!==b.dataset.d);lsSave(d);Net.send('ls-del',{c,id:b.dataset.d});this.render()});
    $('#li-r')&&($('#li-r').onclick=()=>{const u=items.filter(x=>!x.d),p=u[Math.floor(Math.random()*u.length)];sfx.reveal();confetti(40);$('#li-pick').innerHTML=`<div class="paper">${esc(p.t)}</div>`})},
  stop(){}};

/* ---------- Memory Wall ---------- */
let wallPending=null;
function wallMerge(arr){const w=LS.get('lg_wall',[]),ids=new Set(w.map(x=>x.id));let n=0;
  (Array.isArray(arr)?arr:[]).forEach(x=>{if(x&&/^[a-z0-9]{3,12}$/.test(x.id)&&typeof x.img==='string'&&x.img.startsWith('data:image/')&&x.img.length<200000&&!ids.has(x.id)){w.push({id:x.id,img:x.img,cap:String(x.cap||'').slice(0,60),by:String(x.by||'').slice(0,20),date:x.date||''});n++}});
  if(n){LS.set('lg_wall',w.slice(-60));if(current==='wall')Games.wall.render()}return n}
Net.on('wall-sync',a=>wallMerge(a));
Net.on('wall-add',x=>{if(wallMerge([x]))toast(`🖼️ ${Net.partner} pinned a new photo!`)});
Net.on('wall-del',id=>{LS.set('lg_wall',LS.get('lg_wall',[]).filter(x=>x.id!==id));if(current==='wall')Games.wall.render()});
Games.wall={title:'Memory Wall 🖼️',
  start(el){this.el=el;wallPending=null;this.render()},
  render(){const el=this.el,w=LS.get('lg_wall',[]);
    el.innerHTML=`<div class="center"><label class="btn alt small">📷 Choose a photo<input type="file" id="wl-f" accept="image/*" hidden></label>
      ${wallPending?`<div style="margin:10px 0"><img src="${wallPending}" style="width:110px;height:110px;object-fit:cover;border-radius:10px;border:5px solid #fff"></div>
      <div class="row" style="flex-wrap:nowrap;max-width:420px;margin:0 auto"><input id="wl-c" maxlength="50" placeholder="Caption (e.g. our first call 🥰)"><button class="btn" id="wl-p">📌 Pin</button></div>`:'<p class="note">Add photos of you, your day, or something that reminds you of them. They\'re shared with your partner.</p>'}</div>
      <div class="wall">${w.slice().reverse().map((x,i)=>`<div class="polaroid" data-i="${x.id}" style="--r:${(i%5-2)*1.6}deg"><img src="${x.img}"><p>${esc(x.cap||'💗')}</p><small>${esc(x.by)} ${esc(x.date)}</small></div>`).join('')||'<p class="note center" style="grid-column:1/-1">Your wall is empty… pin the first memory! 📸</p>'}</div>`;
    $('#wl-f').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(w.length>=60){toast('Wall is full (60) — delete one first');return}wallPending=await resizeImg(f,360);this.render()};
    $('#wl-p')&&($('#wl-p').onclick=()=>{const item={id:uid(),img:wallPending,cap:$('#wl-c').value.trim(),by:me.name,date:new Date().toLocaleDateString()};
      const arr=LS.get('lg_wall',[]);arr.push(item);LS.set('lg_wall',arr);Net.send('wall-add',item);wallPending=null;sfx.win();confetti(40);addLove(2);quest('create');this.render()});
    $$('.polaroid',el).forEach(p=>p.onclick=()=>{const x=w.find(y=>y.id===p.dataset.i);if(!x)return;const lb=document.createElement('div');lb.id='lightbox';
      lb.innerHTML=`<img src="${x.img}"><p>${esc(x.cap)}</p><div class="row"><button class="btn ghost small" id="lb-x">Close</button><button class="btn small" id="lb-d">🗑 Delete</button></div>`;document.body.appendChild(lb);
      $('#lb-x').onclick=()=>lb.remove();lb.onclick=e=>{if(e.target===lb)lb.remove()};
      $('#lb-d').onclick=()=>{LS.set('lg_wall',LS.get('lg_wall',[]).filter(y=>y.id!==x.id));Net.send('wall-del',x.id);lb.remove();this.render()}})},
  stop(){wallPending=null}};

/* ---------- Love Letters ---------- */
const OPENWHEN=['😢 when you feel sad','💤 when you can\'t sleep','🥺 when you miss me','😡 when you\'re mad at me','🎉 when you need to celebrate','😂 when you need a laugh','💪 when you need courage','🌙 for tonight','💍 on our anniversary','🍀 when you have a big day'];
function ltMerge(arr,announce){const inn=LS.get('lg_lt_in',[]),ids=new Set(inn.map(x=>x.id));let n=0;
  (Array.isArray(arr)?arr:[]).forEach(x=>{if(x&&/^[a-z0-9]{3,12}$/.test(x.id)&&x.text&&!ids.has(x.id)){inn.push({id:x.id,label:String(x.label||'💌 a letter').slice(0,60),text:String(x.text).slice(0,1500),unlock:+x.unlock||0,from:String(x.from||'').slice(0,20),ts:+x.ts||Date.now(),read:false});n++}});
  if(n){LS.set('lg_lt_in',inn);if(announce){toast(`💌 New love letter from ${Net.partner}!`);sfx.love();vibe([80,40,80])}if(current==='letters')Games.letters.render()}return n}
Net.on('lt-read',()=>{toast(`💌 ${Net.partner} is reading your letter right now…`);floatEmoji('💌');sfx.love();vibe(40)});
Net.on('lt-sync',a=>ltMerge(a,true));Net.on('lt-new',x=>ltMerge([x],true));
Games.letters={title:'Love Letters 💌',tab:'in',view:null,
  start(el){this.el=el;this.view=null;this.render()},
  render(){const el=this.el,inn=LS.get('lg_lt_in',[]),out=LS.get('lg_lt_out',[]),unread=inn.filter(x=>!x.read&&!(x.unlock&&Date.now()<x.unlock)).length;
    if(this.view){const L=inn.find(x=>x.id===this.view);if(L){el.innerHTML=`<button class="btn ghost small" id="lt-b">← Back</button><h3 style="margin-top:12px">${esc(L.label)}</h3><div class="letter">${esc(L.text)}</div><p class="note center">— ${esc(L.from||Net.partner)}, ${new Date(L.ts).toLocaleDateString()}</p>`;$('#lt-b').onclick=()=>{this.view=null;this.render()};return}}
    el.innerHTML=`<div class="subtabs"><button data-t="in" class="${this.tab==='in'?'sel':''}">📬 Inbox ${unread?`(${unread} new)`:`(${inn.length})`}</button><button data-t="write" class="${this.tab==='write'?'sel':''}">✍️ Write</button><button data-t="out" class="${this.tab==='out'?'sel':''}">📤 Sent (${out.length})</button></div><div id="lt-body"></div>`;
    $$('[data-t]',el).forEach(b=>b.onclick=()=>{this.tab=b.dataset.t;this.render()});
    const body=$('#lt-body');
    if(this.tab==='in'){body.innerHTML=inn.slice().reverse().map(x=>{const lock=x.unlock&&Date.now()<x.unlock;
      return `<div class="env ${lock?'locked':''} ${!x.read&&!lock?'unread':''}" data-o="${x.id}"><span class="ei">${lock?'🔒':x.read?'📖':'💌'}</span><div class="et"><b>${esc(x.label)}</b><br><small class="note">from ${esc(x.from||Net.partner)}${lock?` · opens ${new Date(x.unlock).toLocaleString()}`:''}</small></div></div>`}).join('')||'<p class="note center">No letters yet. Write one for them, and when they write back it will show up here 💕</p>';
      $$('[data-o]',body).forEach(b=>b.onclick=()=>{const L=inn.find(x=>x.id===b.dataset.o);if(L.unlock&&Date.now()<L.unlock){toast('🔒 Not yet! Opens '+new Date(L.unlock).toLocaleString());sfx.bad();return}
        Net.send('lt-read',{id:L.id});if(!L.read){L.read=true;LS.set('lg_lt_in',inn);sfx.reveal();confetti(40);addLove(3)}this.view=L.id;this.render()})}
    else if(this.tab==='write'){body.innerHTML=`<p class="note">Write a letter they can open later. It's delivered next time you're both online, and waits in their inbox. 💌</p>
      <select id="lt-k">${OPENWHEN.map(o=>`<option>Open ${o}</option>`).join('')}<option value="cap">⏰ Time capsule (locked until a date)</option></select>
      <input type="datetime-local" id="lt-d" class="hidden" style="margin-top:8px">
      <textarea id="lt-t" rows="7" maxlength="1200" placeholder="Dear you…" style="margin-top:8px"></textarea>
      <div class="center" style="margin-top:10px"><button class="btn" id="lt-s">Seal & send 💌</button></div>`;
      $('#lt-k').onchange=e=>$('#lt-d').classList.toggle('hidden',e.target.value!=='cap');
      $('#lt-s').onclick=()=>{const text=$('#lt-t').value.trim();if(!text){toast('Write something first 💭');return}
        const cap=$('#lt-k').value==='cap',unlock=cap?Date.parse($('#lt-d').value):0;if(cap&&!unlock){toast('Pick the unlock date ⏰');return}
        const L={id:uid(),label:cap?'⏰ A time capsule':$('#lt-k').value,text,unlock,from:me.name,ts:Date.now()};
        const o=LS.get('lg_lt_out',[]);o.push(L);LS.set('lg_lt_out',o);Net.send('lt-new',L);sfx.win();confetti(60);addLove(3);quest('create');toast(Net.connected?'Sent! 💌':'Saved — it will send when you connect 💌');this.tab='out';this.render()}}
    else body.innerHTML=out.slice().reverse().map(x=>`<div class="env" style="cursor:default"><span class="ei">📤</span><div class="et"><b>${esc(x.label)}</b><br><small class="note">${new Date(x.ts).toLocaleDateString()}${x.unlock?' · unlocks '+new Date(x.unlock).toLocaleString():''}</small></div></div>`).join('')||'<p class="note center">You haven\'t written any yet ✍️</p>'},
  stop(){}};

/* ---------- Together Timer ---------- */
let ttPending=null;
Net.on('tt-start',d=>{if(current==='timer')Games.timer.begin(d.sec,d.label,true);else{ttPending={...d,at:Date.now()};toast(`⏳ ${Net.partner} started a ${Math.round(d.sec/60)} min timer — open Together Timer to join!`)}});
Net.on('tt-stop',()=>{if(current==='timer')Games.timer.halt(true)});
Games.timer={title:'Together Timer ⏳',T:null,
  start(el){this.el=el;this.T=null;this.render();if(ttPending&&Date.now()-ttPending.at<6e4){const p=ttPending;ttPending=null;this.begin(p.sec-Math.round((Date.now()-p.at)/1000),p.label,true)}},
  begin(sec,label,remote){if(sec<=0)return;this.T={end:Date.now()+sec*1000,dur:sec,label};if(!remote)Net.send('tt-start',{sec,label});sfx.pop();this.render();clearInterval(this.iv);this.iv=setInterval(()=>this.tick(),500)},
  halt(remote){this.T=null;clearInterval(this.iv);if(!remote)Net.send('tt-stop');this.render()},
  snap(){return this.T&&{end:this.T.end-Date.now(),dur:this.T.dur,label:this.T.label}},
  restore(d){if(!this.T&&d&&d.end>0){this.T={end:Date.now()+d.end,dur:d.dur,label:d.label};this.render();clearInterval(this.iv);this.iv=setInterval(()=>this.tick(),500)}},
  tick(){const T=this.T;if(!T||current!=='timer'){clearInterval(this.iv);return}const left=T.end-Date.now();
    if(left<=0){this.T=null;clearInterval(this.iv);sfx.win();confetti(120);addLove(5);stat('timers');toast('⏳ Time! You did it together 💞');this.render();return}
    const p=1-left/(T.dur*1000);const r=$('#tring');if(r){r.style.setProperty('--p',(p*100)+'%');$('#tt').textContent=fmtTime(left);$('#tp').textContent=p<.25?'🌱':p<.5?'🌿':p<.75?'🌷':'🌸'}},
  render(){const el=this.el,T=this.T;
    el.innerHTML=T?`<div class="center"><p><b>${esc(T.label)}</b> — together${Net.connected?' with '+esc(Net.partner):''} 💞</p>
      <div class="tring" id="tring"><span class="tp" id="tp">🌱</span><span class="tt" id="tt">--:--</span></div>
      <p class="note">Watch your little flower grow while you focus (or just be together).</p><button class="btn ghost" id="tm-stop">Stop</button></div>`
     :`<div class="center"><p style="font-size:18px">Do something side by side — study, work, cook, or fall asleep on a call. Start a timer and it starts on <b>both</b> screens. ⏳💞</p>
      <select id="tm-l" style="max-width:320px"><option>📚 Study together</option><option>💻 Work together</option><option>🧹 Chores together</option><option>🍳 Cook together</option><option>😴 Sleep call</option><option>🧘 Chill together</option></select>
      <div class="pickrow">${[10,25,45,60].map(m=>`<button data-m="${m}">${m} min</button>`).join('')}</div>
      <div class="row" style="justify-content:center"><input id="tm-c" type="number" min="1" max="600" placeholder="Custom minutes" style="max-width:180px"><button class="btn small" id="tm-go">Start</button></div></div>`;
    if(T){this.tick();$('#tm-stop').onclick=()=>this.halt(false)}else{
      $$('[data-m]',el).forEach(b=>b.onclick=()=>this.begin(+b.dataset.m*60,$('#tm-l').value,false));
      $('#tm-go').onclick=()=>{const m=+$('#tm-c').value;if(m>=1&&m<=600)this.begin(m*60,$('#tm-l').value,false);else toast('Enter 1–600 minutes')}}},
  stop(){clearInterval(this.iv)}};

/* ---------- Trophy Room ---------- */
const listsDone=()=>{const l=lsGet();return LCATS.reduce((n,[c])=>n+l[c].filter(x=>x.d).length,0)};
const BADGES=[
  {id:'spark',e:'✨',t:'First Spark',d:'Earn your first 💗',f:()=>loves()>=1},
  {id:'sweet',e:'🍓',t:'Sweethearts',d:'Reach 50 💗',f:()=>loves()>=50},
  {id:'birds',e:'🐦',t:'Lovebirds',d:'Reach 150 💗',f:()=>loves()>=150},
  {id:'soul',e:'💫',t:'Soulmates',d:'Reach 300 💗',f:()=>loves()>=300},
  {id:'forever',e:'💍',t:'Forever & Always',d:'Reach 600 💗',f:()=>loves()>=600},
  {id:'talk5',e:'💬',t:'Heart to Heart',d:'Answer 5 Deep Talk questions',f:()=>LS.get('lg_qa_hist',[]).length>=5},
  {id:'talk25',e:'🌊',t:'Deep Diver',d:'Answer 25 questions',f:()=>LS.get('lg_qa_hist',[]).length>=25},
  {id:'talk60',e:'📖',t:'Open Book',d:'Answer 60 questions',f:()=>LS.get('lg_qa_hist',[]).length>=60},
  {id:'play5',e:'🎮',t:'Game On',d:'Try 5 different games',f:()=>LS.get('lg_played',[]).length>=5},
  {id:'play15',e:'🕹️',t:'Arcade Legend',d:'Try 15 different games',f:()=>LS.get('lg_played',[]).length>=15},
  {id:'s3',e:'🔥',t:'3-Day Streak',d:'Be here 3 days in a row',f:()=>streak()>=3},
  {id:'s7',e:'🌟',t:'Week of Love',d:'7-day streak',f:()=>streak()>=7},
  {id:'s30',e:'👑',t:'Monthly Magic',d:'30-day streak',f:()=>streak()>=30},
  {id:'allq',e:'✅',t:'Quest Master',d:'Finish all daily quests in one day',f:()=>stats('allq')>=1},
  {id:'let1',e:'💌',t:'Love Letter',d:'Write your first letter',f:()=>LS.get('lg_lt_out',[]).length>=1},
  {id:'let5',e:'🕊️',t:'Poet',d:'Write 5 letters',f:()=>LS.get('lg_lt_out',[]).length>=5},
  {id:'wall3',e:'📸',t:'Memory Maker',d:'Pin 3 photos',f:()=>LS.get('lg_wall',[]).length>=3},
  {id:'list5',e:'📝',t:'Planners',d:'Check off 5 list items',f:()=>listsDone()>=5},
  {id:'pet10',e:'🐱',t:'Pet Parents',d:'Care for Mochi 10 times',f:()=>stats('pet')>=10},
  {id:'timer',e:'⏳',t:'Side by Side',d:'Finish a Together Timer',f:()=>stats('timers')>=1},
  {id:'garden',e:'🌻',t:'Green Thumbs',d:'Win Love Garden',f:()=>stats('garden')>=1},
  {id:'garden3',e:'🧟',t:'Zombie Squad',d:'Win Love Garden 3 times',f:()=>stats('garden')>=3},
  {id:'trivia',e:'🧠',t:'Big Brains',d:'Win Couple Trivia',f:()=>stats('trivia')>=1},
  {id:'racer',e:'🏁',t:'Speed Racers',d:'Finish Flappy, 2048 and Snake',f:()=>stats('flappy')&&stats('g2048')&&stats('snake')}];
function checkBadges(){const u=LS.get('lg_badges',[]);let fresh=null;BADGES.forEach(b=>{if(!u.includes(b.id)&&b.f()){u.push(b.id);fresh=b}});
  if(fresh){LS.set('lg_badges',u);Net.send('bd',u);toast(`🏆 New badge: ${fresh.e} ${fresh.t}!`);sfx.win();confetti(70)}}
Games.trophy={title:'Trophy Room 🏆',
  start(el){checkBadges();const u=LS.get('lg_badges',[]);
    el.innerHTML=`<div class="center"><h3>${u.length} / ${BADGES.length} badges</h3><div class="progress" style="margin:8px 0 16px"><i style="width:${u.length/BADGES.length*100}%"></i></div></div>
      <div class="badges">${BADGES.map(b=>`<div class="badge ${u.includes(b.id)?'':'lock'}"><b>${u.includes(b.id)?b.e:'🔒'}</b>${esc(b.t)}<small>${esc(b.d)}</small></div>`).join('')}</div>`},
  stop(){}};

/* ---------- Never Have I Ever ---------- */
const NHIE=["stayed up all night talking to someone","sent a text and instantly regretted it","cried during a movie","re-read our old messages","fallen asleep on a call with you","pretended to like a food to be polite","sung in the shower like nobody's listening","talked to myself out loud","looked at your photos when I missed you","stalked an ex online (be honest)","danced alone in my room","kept a gift from someone special","laughed so hard I cried","gotten a tattoo or wanted one","sent a message to the wrong person","fallen for someone I met online","planned our future in my head","wished I could teleport to you","been jealous over something silly","made a playlist for someone","said 'I love you' first","cried because I missed you","forgotten an important date","sung to you when nobody was around","taken a photo just to send to you","stayed on a call until the battery died","pretended to be busy to hide a surprise","fallen in love with your voice","watched a show early without you (guilty!)","talked about our wedding in my sleep"];
Games.nhie={title:'Never Have I Ever',
  start(el){const S=this.s={i:Math.floor(Math.random()*NHIE.length),mine:null,theirs:null,both:0};this.el=el;
    Net.on('nh-pick',d=>{if(current!=='nhie'||d.i!==S.i)return;S.theirs=d.c;this.draw()});Net.on('nh-next',i=>{if(current!=='nhie')return;S.i=i;S.mine=S.theirs=null;S.done=0;this.draw()});this.draw()},
  snap(){const S=this.s;return{i:S.i,c:S.mine}},restore(d){const S=this.s;if(d.i!==S.i){S.i=d.i;S.mine=null}S.theirs=d.c;this.draw()},
  draw(){const S=this.s,both=S.mine!==null&&(S.theirs!==null||!Net.connected);
    this.el.innerHTML=`<div class="qcard"><span class="cat">🙋 Never have I ever…</span><h2>${esc(NHIE[S.i])}</h2></div>
      <div class="pickrow"><button data-c="1" class="${S.mine===1?'picked':''}" ${S.mine!==null?'disabled':''}>🙋 I have!</button><button data-c="0" class="${S.mine===0?'picked':''}" ${S.mine!==null?'disabled':''}>🙅 Never</button></div>
      <div class="status">${both?(Net.connected?`You: ${S.mine?'🙋 I have':'🙅 Never'} · ${esc(Net.partner)}: ${S.theirs?'🙋 I have':'🙅 Never'}${S.mine&&S.theirs?' — WE BOTH HAVE! 😂':S.mine===S.theirs?' — same!':''}`:''):(S.mine!==null?`Waiting for ${esc(Net.partner)}… 👀`:'Answer honestly!')}</div>
      <div class="center"><button class="btn" id="nh-n">Next ➡️</button></div>`;
    if(both&&!S.done){S.done=1;if(Net.connected&&S.mine&&S.theirs){confetti(40);sfx.win()}else sfx.reveal();addLove(1)}
    $$('.pickrow button').forEach(b=>b.onclick=()=>{S.mine=+b.dataset.c;S.done=0;sfx.pop();Net.send('nh-pick',{i:S.i,c:S.mine});this.draw()});
    $('#nh-n').onclick=()=>{S.i=(S.i+1)%NHIE.length;S.mine=S.theirs=null;S.done=0;Net.send('nh-next',S.i);this.draw()}},
  stop(){}};

/* ---------- Two Truths & a Lie ---------- */
Games.ttl={title:'Two Truths & a Lie',
  start(el){const S=this.s={phase:'idle',s:[],lie:-1,pick:-1,me:0,them:0};this.el=el;
    Net.on('tl-claim',()=>{if(current!=='ttl')return;Object.assign(S,{phase:'waiting',s:[],lie:-1,pick:-1,wrote:false});this.draw()});
    Net.on('tl-set',d=>{if(current!=='ttl')return;Object.assign(S,{phase:'guessing',s:d.s,pick:-1});sfx.reveal();this.draw()});
    Net.on('tl-guess',d=>{if(current!=='ttl')return;S.pick=d.i;const ok=d.i===S.lie;ok?S.them++:S.me++;S.phase='result';Net.send('tl-res',{lie:S.lie,i:d.i});this.draw()});
    Net.on('tl-res',d=>{if(current!=='ttl')return;S.lie=d.lie;S.pick=d.i;d.i===d.lie?S.me++:S.them++;S.phase='result';this.draw()});
    this.draw()},
  draw(){const S=this.s,el=this.el;const sc=`<div class="scores"><div class="score">You: ${S.me}</div><div class="score">${esc(Net.partner)}: ${S.them}</div></div>`;
    if(S.phase==='idle')el.innerHTML=`${sc}<div class="center"><p style="font-size:18px">One writes <b>three statements about themselves</b> — two true, one lie. The other guesses the lie. Guess right and you score; fool them and <i>you</i> score! 🤥</p><button class="btn" id="tl-go">✍️ I'll write mine</button></div>`;
    else if(S.phase==='writing')el.innerHTML=`${sc}<p class="note center">Write 3 things about you and tick which one is the LIE.</p>${[0,1,2].map(i=>`<div class="qedit"><label><input type="radio" name="lie" data-i="${i}" ${i===2?'checked':''}><input class="tlt" maxlength="90" placeholder="Statement ${i+1}"></label></div>`).join('')}<div class="center"><button class="btn" id="tl-send">Send 💌</button></div>`;
    else if(S.phase==='waiting')el.innerHTML=`${sc}<div class="waiting">✍️ ${esc(Net.partner)} is writing their statements…</div>`;
    else if(S.phase==='sent')el.innerHTML=`${sc}<div class="waiting">⏳ ${esc(Net.partner)} is guessing which one is the lie…</div>`;
    else if(S.phase==='guessing')el.innerHTML=`${sc}<p class="center"><b>Which one is the LIE?</b></p>${S.s.map((t,i)=>`<button class="opt" data-g="${i}">${esc(t)}</button>`).join('')}`;
    else el.innerHTML=`${sc}${S.s.map((t,i)=>`<div class="opt ${i===S.lie?'good':''} ${i===S.pick&&i!==S.lie?'bad':''}">${esc(t)} ${i===S.lie?'🤥 (the lie!)':''}${i===S.pick?' 👈 guess':''}</div>`).join('')}<div class="status">${S.pick===S.lie?(S.wrote?`${esc(Net.partner)} spotted it! 🕵️`:'You spotted the lie! 🎉'):(S.wrote?'You fooled them! 😈':'Fooled! 😜')}</div><div class="center"><button class="btn" id="tl-next">Next round ▶</button></div>`;
    $('#tl-go')&&($('#tl-go').onclick=()=>{if(!Net.connected){toast('Connect with your love to play 💞');return}if(!partnerHere('ttl'))return;S.phase='writing';S.wrote=true;Net.send('tl-claim');this.draw()});
    $('#tl-send')&&($('#tl-send').onclick=()=>{const t=$$('.tlt').map(x=>x.value.trim());if(t.some(x=>!x)){toast('Fill in all three ✍️');return}
      const lie=+($$('[name=lie]').find(r=>r.checked).dataset.i);const ord=shuffle([0,1,2]);S.s=ord.map(i=>t[i]);S.lie=ord.indexOf(lie);S.phase='sent';Net.send('tl-set',{s:S.s});this.draw()});
    $$('[data-g]',el).forEach(b=>b.onclick=()=>{S.pick=+b.dataset.g;S.wrote=false;S.phase='sent';Net.send('tl-guess',{i:S.pick});sfx.pop();this.draw()});
    $('#tl-next')&&($('#tl-next').onclick=()=>{S.phase='idle';S.wrote=false;this.draw()});
    if(S.phase==='result'&&!S.fx){S.fx=1;S.pick===S.lie?sfx.win():sfx.bad()}if(S.phase!=='result')S.fx=0},
  stop(){}};

/* ---------- Couple Trivia ---------- */
const TRIV=[
 ["What is the capital of France?",["Paris","Rome","Madrid","Berlin"],0],["Which planet is known as the Red Planet?",["Venus","Mars","Jupiter","Mercury"],1],
 ["How many continents are there?",["5","6","7","8"],2],["Who painted the Mona Lisa?",["Van Gogh","Picasso","Leonardo da Vinci","Monet"],2],
 ["What is the largest ocean?",["Atlantic","Indian","Arctic","Pacific"],3],["Which flower is the classic symbol of love?",["Sunflower","Red rose","Daisy","Tulip"],1],
 ["What is the chemical symbol for gold?",["Ag","Au","Gd","Go"],1],["Which animal is the fastest on land?",["Lion","Horse","Cheetah","Greyhound"],2],
 ["Which Disney film has the song 'A Whole New World'?",["Frozen","Aladdin","Moana","Tangled"],1],["What date is Valentine's Day?",["Feb 14","Mar 14","Jan 14","Feb 4"],0],
 ["Who wrote Romeo and Juliet?",["Dickens","Austen","Shakespeare","Twain"],2],["What gas do plants absorb from the air?",["Oxygen","Carbon dioxide","Nitrogen","Helium"],1],
 ["Which planet is the largest?",["Saturn","Earth","Jupiter","Neptune"],2],["What is the hardest natural substance?",["Gold","Iron","Diamond","Quartz"],2],
 ["How many hearts does an octopus have?",["1","2","3","8"],2],["In which country is the Taj Mahal?",["India","Turkey","Egypt","Iran"],0],
 ["Which sweet is made by bees?",["Syrup","Honey","Caramel","Jam"],1],["What is the smallest prime number?",["0","1","2","3"],2],
 ["Which city is called 'The City of Love'?",["Venice","Paris","Vienna","Verona"],1],["What do pandas mainly eat?",["Bamboo","Fish","Berries","Grass"],0],
 ["What is the tallest animal?",["Elephant","Giraffe","Ostrich","Camel"],1],["How many colours are in a rainbow?",["5","6","7","8"],2],
 ["Which instrument has 88 keys?",["Guitar","Violin","Piano","Flute"],2],["What is 9 × 9?",["72","81","99","91"],1],
 ["Which country gave the Statue of Liberty to the USA?",["UK","Spain","France","Italy"],2],["What is the freezing point of water in °C?",["0","10","-10","32"],0],
 ["Which bird is a symbol of peace?",["Eagle","Dove","Owl","Parrot"],1],["Which is the longest river in the world (commonly cited)?",["Amazon","Nile","Yangtze","Danube"],1],
 ["Which colour do you get mixing red and white?",["Purple","Orange","Pink","Brown"],2],["What's the name of our galaxy?",["Andromeda","Milky Way","Whirlpool","Sombrero"],1]];
Net.on('tr-start',d=>{if(current==='trivia')Games.trivia.begin(d.order)});
Net.on('tr-ans',d=>{const T=Games.trivia.s;if(current==='trivia'&&T&&T.r===d.r){T.theirs={c:d.c,ms:d.ms};Games.trivia.check()}});
Games.trivia={title:'Couple Trivia 🧠',
  start(el){this.el=el;this.s=null;this.menu()},
  menu(){this.el.innerHTML=`<div class="center"><p style="font-size:18px">10 questions, same for both of you. Right answer = <b>+10</b>, and the <b>faster</b> correct answer gets <b>+5</b> bonus! ⚡</p><button class="btn" id="tv-go">▶ Start</button></div>`;
    $('#tv-go').onclick=()=>{if(!partnerHere('trivia'))return;const order=shuffle(TRIV.map((_,i)=>i)).slice(0,10);Net.send('tr-start',{order});this.begin(order)}},
  begin(order){this.s={order,r:0,me:0,them:0,mine:null,theirs:null,t0:performance.now(),done:false};this.round()},
  round(){const S=this.s;S.mine=S.theirs=null;S.done=false;S.t0=performance.now();const q=TRIV[S.order[S.r]];
    this.el.innerHTML=`<div class="scores"><div class="score">You: ${S.me}</div><div class="score">${esc(Net.connected?Net.partner:'—')}: ${S.them}</div></div>
      <div class="progress"><i style="width:${S.r/10*100}%"></i></div><div class="timerbar"><i id="tv-b" style="width:100%"></i></div>
      <div class="qcard"><span class="cat">Question ${S.r+1}/10</span><h2>${esc(q[0])}</h2></div>
      <div class="optrow">${q[1].map((o,i)=>`<button class="opt" data-c="${i}">${esc(o)}</button>`).join('')}</div><div class="status" id="tv-s"></div>`;
    clearInterval(this.iv);this.iv=setInterval(()=>{if(current!=='trivia'){clearInterval(this.iv);return}const el=performance.now()-S.t0;const b=$('#tv-b');b&&(b.style.width=Math.max(0,100-el/150)+'%');if(el>15000){clearInterval(this.iv);this.check(true)}},200);
    $$('.opt',this.el).forEach(b=>b.onclick=()=>{if(S.mine)return;const ms=Math.round(performance.now()-S.t0);S.mine={c:+b.dataset.c,ms};b.classList.add('picked');$$('.opt').forEach(x=>x.disabled=true);sfx.pop();Net.send('tr-ans',{r:S.r,c:S.mine.c,ms});$('#tv-s').textContent=Net.connected?`Locked in! Waiting for ${Net.partner}… 👀`:'';this.check()})},
  check(timeout){const S=this.s;if(!S||S.done)return;if(!(S.mine&&(S.theirs||!Net.connected))&&!timeout)return;S.done=true;clearInterval(this.iv);
    const q=TRIV[S.order[S.r]],ok=a=>a&&a.c===q[2];let mp=0,tp=0;
    if(ok(S.mine))mp=10;if(ok(S.theirs))tp=10;
    if(mp&&tp){if(S.mine.ms<S.theirs.ms)mp+=5;else if(S.theirs.ms<S.mine.ms)tp+=5}else if(mp&&!S.theirs&&Net.connected)mp+=5;else if(tp&&!S.mine)tp+=5;
    S.me+=mp;S.them+=tp;mp?sfx.match():sfx.bad();
    $$('.opt',this.el).forEach((b,i)=>{b.disabled=true;if(i===q[2])b.classList.add('good');else if(S.mine&&i===S.mine.c)b.classList.add('bad');
      if(S.theirs&&i===S.theirs.c)b.insertAdjacentHTML('beforeend',` <small>👈 ${esc(Net.partner)}</small>`)});
    $('#tv-s')&&($('#tv-s').textContent=`You +${mp}${Net.connected?` · ${Net.partner} +${tp}`:''}`);
    setTimeout(()=>{if(current!=='trivia'||this.s!==S)return;S.r++;if(S.r>=10)this.finish();else this.round()},2600)},
  finish(){const S=this.s;const win=S.me>S.them,tie=S.me===S.them;sfx.win();confetti(90);if(!Net.connected||win||tie){addLove(8);stat('trivia')}
    this.el.innerHTML=`<div class="center"><div class="big-heart">🏆</div><h2>${!Net.connected?`You scored ${S.me}!`:win?'🎉 You win!':tie?"It's a tie! 💞":`${esc(Net.partner)} wins! 🥳`}</h2><p>${S.me} vs ${S.them}</p><button class="btn" id="tv-a">Play again</button></div>`;$('#tv-a').onclick=()=>this.menu()},
  stop(){clearInterval(this.iv)}};

/* ---------- Quick Draw ---------- */
Net.on('qd-start',d=>{if(current==='qd')Games.qd.begin(d.delays)});
Net.on('qd-tap',d=>{const S=Games.qd.s;if(current==='qd'&&S){(S.res[d.r]=S.res[d.r]||{}).t=d.ms;Games.qd.resolve(d.r)}});
Games.qd={title:'Quick Draw ⚡',
  start(el){this.el=el;this.s=null;this.menu()},
  menu(){this.el.innerHTML=`<div class="center"><p style="font-size:18px">Wait for the circle to turn <b style="color:#37a68a">GREEN</b>, then tap as fast as you can! Tap too early and you lose the round. Best of 5. ⚡</p><button class="btn" id="qd-go">▶ Start</button></div>`;
    $('#qd-go').onclick=()=>{if(!partnerHere('qd'))return;const delays=Array.from({length:5},()=>1500+Math.floor(Math.random()*3500));Net.send('qd-start',{delays});this.begin(delays)}},
  begin(delays){this.s={delays,r:-1,me:0,them:0,res:{},t0:0,state:'idle'};this.next()},
  next(){const S=this.s;S.r++;if(S.r>=5){this.end();return}S.state='wait';S.got=false;
    this.el.innerHTML=`<div class="scores"><div class="score">You: ${S.me}</div><div class="score">${esc(Net.connected?Net.partner:'—')}: ${S.them}</div></div><div class="status">Round ${S.r+1}/5</div>
      <button class="bigbtn" id="qd-b">✋</button><div class="status" id="qd-s">Wait for green…</div>`;
    const b=$('#qd-b');const r=S.r;
    this.tm=setTimeout(()=>{if(current!=='qd'||S.r!==r)return;S.state='go';S.t0=performance.now();b.classList.add('go');b.textContent='TAP!';beep(880,.12,'triangle',.2);
      this.tm2=setTimeout(()=>{if(S.r===r&&!S.got)this.tap(true)},3000)},S.delays[r]);
    b.onpointerdown=()=>this.tap(false)},
  tap(auto){const S=this.s;if(!S||S.got)return;S.got=true;clearTimeout(this.tm2);const b=$('#qd-b');let ms;
    if(S.state==='wait'){ms=99999;clearTimeout(this.tm);b&&b.classList.add('bad');$('#qd-s').textContent='Too early! 😬';sfx.bad()}
    else if(auto){ms=99999}else{ms=Math.round(performance.now()-S.t0);$('#qd-s').textContent=`${ms} ms!`;sfx.pop()}
    S.state='done';(S.res[S.r]=S.res[S.r]||{}).m=ms;Net.send('qd-tap',{r:S.r,ms});this.resolve(S.r)},
  resolve(r){const S=this.s;if(!S||S.r!==r||S.settled===r)return;const x=S.res[r];if(!x||x.m===undefined||(Net.connected&&x.t===undefined))return;S.settled=r;
    const m=x.m,t=Net.connected?x.t:99999;let msg;
    if(m<t){S.me++;msg=`You win the round! 🎉 (${m<99999?m+' ms':''}${t<99999?` vs ${t} ms`:''})`;sfx.win()}else if(t<m){S.them++;msg=`${Net.partner} wins the round (${t} ms) 😜`;sfx.bad()}else msg='Nobody tapped in time 😅';
    const s=$('#qd-s');s&&(s.textContent=msg);setTimeout(()=>{if(current==='qd'&&this.s===S)this.next()},2200)},
  end(){const S=this.s;const win=S.me>S.them;sfx.win();confetti(80);if(!Net.connected||S.me>=S.them)addLove(5);
    this.el.innerHTML=`<div class="center"><div class="big-heart">⚡</div><h2>${!Net.connected?`${S.me}/5 rounds`:win?'🎉 You win!':S.me===S.them?"It's a tie! 💞":`${esc(Net.partner)} wins! 🥳`}</h2><p>${S.me} — ${S.them}</p><button class="btn" id="qd-a">Again</button></div>`;$('#qd-a').onclick=()=>this.menu()},
  stop(){clearTimeout(this.tm);clearTimeout(this.tm2)}};

/* ---------- Reversi ---------- */
const RVD=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function rvFlips(b,i,p){if(b[i])return[];const r=i>>3,c=i&7,o=3-p,out=[];
  for(const[dr,dc]of RVD){let rr=r+dr,cc=c+dc;const tmp=[];while(rr>=0&&rr<8&&cc>=0&&cc<8&&b[rr*8+cc]===o){tmp.push(rr*8+cc);rr+=dr;cc+=dc}
    if(tmp.length&&rr>=0&&rr<8&&cc>=0&&cc<8&&b[rr*8+cc]===p)out.push(...tmp)}return out}
const rvMoves=(b,p)=>{const m=[];for(let i=0;i<64;i++)if(!b[i]&&rvFlips(b,i,p).length)m.push(i);return m};
Games.reversi={title:'Reversi',
  start(el){this.el=el;this.reset(false);
    Net.on('rv-move',i=>current==='reversi'&&this.move(i,true));Net.on('rv-reset',()=>current==='reversi'&&this.reset(false))},
  reset(send){const b=Array(64).fill(0);b[27]=2;b[28]=1;b[35]=1;b[36]=2;this.s={b,turn:1,over:false,mine:Net.role==='host'?1:2};if(send)Net.send('rv-reset');this.draw()},
  snap(){const S=this.s;return S.b.filter(x=>x).length>4?{b:S.b,turn:S.turn,over:S.over}:null},restore(d){Object.assign(this.s,d);this.draw()},
  move(i,remote){const S=this.s;if(S.over)return;const p=S.turn;if(!remote&&Net.connected&&p!==S.mine)return;
    const f=rvFlips(S.b,i,p);if(!f.length)return;S.b[i]=p;f.forEach(k=>S.b[k]=p);sfx.pop();if(!remote)Net.send('rv-move',i);else vibe(30);
    const o=3-p;if(rvMoves(S.b,o).length)S.turn=o;else if(rvMoves(S.b,p).length){S.turn=p;toast(`${o===S.mine||!Net.connected?'You have':Net.partner+' has'} no moves — pass!`)}else{S.over=true;sfx.win();confetti();
      const a=S.b.filter(x=>x===1).length,c=S.b.filter(x=>x===2).length;if(!Net.connected||(a>=c?1:2)===S.mine)addLove(10)}
    this.draw()},
  draw(){const S=this.s;const mv=S.over?[]:rvMoves(S.b,S.turn),a=S.b.filter(x=>x===1).length,c=S.b.filter(x=>x===2).length;
    const who=p=>p===1?'💗':'🤍',mine=!Net.connected||S.turn===S.mine;
    this.el.innerHTML=`<div class="scores"><div class="score ${S.turn===1&&!S.over?'turn':''}">💗 ${a}${Net.connected&&S.mine===1?' (you)':''}</div><div class="score ${S.turn===2&&!S.over?'turn':''}">🤍 ${c}${Net.connected&&S.mine===2?' (you)':''}</div></div>
      <div class="status">${S.over?(a===c?"It's a tie! 💞":(!Net.connected?`${a>c?'💗':'🤍'} wins!`:((a>c?1:2)===S.mine?'You win! 🎉':`${Net.partner} wins! 🥳`))):(Net.connected?(mine?`Your turn ${who(S.mine)}`:`${Net.partner} is thinking… 🤔`):`${who(S.turn)}'s turn`)}</div>
      <div class="rv">${S.b.map((v,i)=>`<div data-i="${i}" class="${v?'p'+v:''} ${mv.includes(i)&&mine?'ok':''}"></div>`).join('')}</div>
      <div class="center"><button class="btn small" id="rv-r">🔄 New game</button></div>`;
    $$('.rv div',this.el).forEach(d=>d.onclick=()=>this.move(+d.dataset.i,false));$('#rv-r').onclick=()=>this.reset(true)},
  stop(){}};

/* ---------- Draw & Guess ---------- */
const DGW=['cat','house','sun','flower','heart','car','tree','pizza','umbrella','moon','star','fish','cake','bicycle','ice cream','rainbow','butterfly','guitar','key','crown','balloon','cupcake','airplane','snowman','camera','bear','coffee','cloud','teddy bear','phone','rocket','strawberry','apple','elephant','giraffe','castle','candle','ring','kiss','umbrella','beach','mountain','book','glasses','spider','bird','duck','penguin','dinosaur','lightning'];
Net.on('dg-begin',d=>{if(current==='dg')Games.dg.gBegin(d)});
Net.on('dg-s',s=>{if(current==='dg')Games.dg.paint(s)});
Net.on('dg-clr',()=>{if(current==='dg')Games.dg.clr()});
Net.on('dg-g',d=>{if(current==='dg')Games.dg.dGuess(d.text)});
Net.on('dg-fin',d=>{if(current==='dg')Games.dg.fin(d.word,d.ok)});
Games.dg={title:'Draw & Guess ✏️',
  start(el){this.el=el;this.s={role:null,word:'',score:0};this.menu()},
  menu(){this.el.innerHTML=`<div class="center"><p style="font-size:18px">One draws a secret word, the other guesses. Guess it in time and <b>you both score</b>! Team work 💞</p><p>Team score: <b>${this.s.score}</b></p>
    <button class="btn" id="dg-go">🎨 I'll draw</button></div>`;
    $('#dg-go').onclick=()=>{if(!Net.connected){toast('Connect with your love to play 💞');return}if(!partnerHere('dg'))return;this.dBegin()}},
  dBegin(){const S=this.s;S.role='drawer';S.word=DGW[Math.floor(Math.random()*DGW.length)];S.t0=Date.now();S.over=false;S.log=[];Net.send('dg-begin',{len:S.word.length,hint:S.word.replace(/[^ ]/g,'_ ').trim()});this.board()},
  gBegin(d){const S=this.s;S.role='guesser';S.word='';S.hint=d.hint;S.t0=Date.now();S.over=false;S.log=[];sfx.reveal();this.board()},
  board(){const S=this.s,d=S.role==='drawer';
    this.el.innerHTML=`<div class="status">${d?`Draw: <b>${esc(S.word.toUpperCase())}</b> 🎨`:`Guess the drawing! <b>${esc(S.hint)}</b>`}</div>
      <div class="timerbar"><i id="dg-b" style="width:100%"></i></div>
      <div class="canvas-wrap"><canvas id="dgc" width="600" height="400" style="width:100%;background:#fffdf5;border-radius:18px;box-shadow:var(--shadow);touch-action:none;display:block"></canvas></div>
      ${d?`<div class="pal">${['#4a2c5a','#ff6fa5','#9b7bff','#6ec3ff','#5fd3b3','#ffd766'].map(c=>`<button class="sw ${c==='#4a2c5a'?'sel':''}" data-c="${c}" style="background:${c}"></button>`).join('')}<button class="btn ghost small" id="dg-c">🧽 Clear</button></div>`
      :`<div class="row" style="flex-wrap:nowrap"><input id="dg-i" maxlength="30" placeholder="Your guess…"><button class="btn" id="dg-g">Guess</button></div>`}
      <div id="dg-l" class="note center"></div>`;
    this.x=$('#dgc').getContext('2d');this.clr();
    if(d){const c=$('#dgc');let col='#4a2c5a',down=false,last=null;const pos=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]};
      $$('.sw').forEach(b=>b.onclick=()=>{col=b.dataset.c;$$('.sw').forEach(z=>z.classList.toggle('sel',z===b))});
      c.onpointerdown=e=>{c.setPointerCapture(e.pointerId);down=true;last=pos(e);const s={a:last[0],b:last[1],c:last[0],d:last[1],k:col};this.paint(s);Net.send('dg-s',s)};
      c.onpointermove=e=>{if(!down)return;const p=pos(e);const s={a:last[0],b:last[1],c:p[0],d:p[1],k:col};last=p;this.paint(s);Net.send('dg-s',s)};
      c.onpointerup=c.onpointercancel=()=>down=false;$('#dg-c').onclick=()=>{this.clr();Net.send('dg-clr')}}
    else{const go=()=>{const t=$('#dg-i').value.trim();if(!t||S.over)return;Net.send('dg-g',{text:t});S.log.push('✗ '+t);$('#dg-i').value='';this.log()};$('#dg-g').onclick=go;$('#dg-i').onkeydown=e=>{if(e.key==='Enter')go()}}
    clearInterval(this.iv);this.iv=setInterval(()=>{if(current!=='dg'||S.over){clearInterval(this.iv);return}const el=(Date.now()-S.t0)/1000,b=$('#dg-b');b&&(b.style.width=Math.max(0,100-el/75*100)+'%');
      if(el>75){clearInterval(this.iv);if(S.role==='drawer'){Net.send('dg-fin',{word:S.word,ok:false});this.fin(S.word,false)}}},300)},
  paint(s){const x=this.x;if(!x)return;x.strokeStyle=s.k;x.lineWidth=6;x.lineCap='round';x.beginPath();x.moveTo(s.a*600,s.b*400);x.lineTo(s.c*600+.01,s.d*400);x.stroke()},
  clr(){const x=this.x;if(x){x.fillStyle='#fffdf5';x.fillRect(0,0,600,400)}},
  log(){const l=$('#dg-l');l&&(l.textContent=this.s.log.slice(-5).join('  ·  '))},
  dGuess(text){const S=this.s;if(S.role!=='drawer'||S.over)return;const norm=x=>x.toLowerCase().replace(/[^a-z]/g,''),ok=norm(text)===norm(S.word)||norm(text)+'s'===norm(S.word)||norm(text)===norm(S.word)+'s';
    S.log.push((ok?'✓ ':'✗ ')+text);this.log();if(ok){Net.send('dg-fin',{word:S.word,ok:true});this.fin(S.word,true)}},
  fin(word,ok){const S=this.s;S.over=true;clearInterval(this.iv);if(ok){S.score++;sfx.win();confetti(80);addLove(4)}else sfx.bad();
    this.el.innerHTML=`<div class="center"><div class="big-heart">${ok?'🎉':'⏰'}</div><h2>${ok?'Guessed it!':"Time's up!"}</h2><p style="font-size:22px">The word was <b>${esc(word)}</b></p><p>Team score: ${S.score}</p><button class="btn" id="dg-n">Next round (swap!) ▶</button></div>`;
    $('#dg-n').onclick=()=>{S.role=null;S.word='';this.menu()}},
  stop(){clearInterval(this.iv)}};

/* ==========================================================================
   LIVE versions of the old "send it to them" games — both of you see the
   same thing at the same moment.
   ========================================================================== */

/* ---------- Love jar: pull a reason TOGETHER ---------- */
Net.on('jar-draw',d=>{Games.jar.shown=d;if(current==='jar')Games.jar.paper(true)});
Games.jar={title:'Reasons I Love You',shown:null,
  start(el){this.el=el;this.shown=null;this.draw()},
  pool(){const mine=LS.get('lg_jar_mine',[]).map(t=>({text:t,by:me.name})),th=jarTheirs.map(t=>({text:t,by:Net.realName||Net.partner}));return[...mine,...th]},
  paper(remote){const n=this.shown,box=$('#jn');if(!box||!n)return;box.innerHTML=`<div class="paper">${esc(n.text)}<div style="font-size:18px;margin-top:8px">— ${esc(n.by)} 💗</div></div>`;
    if(remote){sfx.love();confetti(30);vibe([40,30,40])}},
  draw(){const el=this.el,mine=LS.get('lg_jar_mine',[]),pool=this.pool();
    el.innerHTML=`<div class="center"><span class="jar" id="jr">🫙</span><p><b>Tap the jar</b> — you'll <b>both</b> see the same reason at the same time 💌<br><span class="note">${pool.length} reasons in our jar</span></p>
      <div id="jn"></div></div><hr style="border:0;border-top:3px dashed #fff;margin:18px 0">
      <h3>Add a reason 💗 (${mine.length})</h3>
      <div class="row" style="flex-wrap:nowrap"><textarea id="jt" rows="2" placeholder="I love how you…"></textarea><button class="btn" id="ja">Add</button></div>
      <div id="jl">${mine.map((n,i)=>`<div class="qedit row" style="justify-content:space-between">${esc(n)}<button class="btn ghost small" data-d="${i}">✕</button></div>`).join('')}</div>`;
    $('#jr').onclick=()=>{const p=this.pool();if(!p.length){toast('The jar is empty… add a reason first 🥺');return}
      const n=p[Math.floor(Math.random()*p.length)];this.shown=n;Net.send('jar-draw',n);sfx.love();confetti(30);this.paper(false)};
    $('#ja').onclick=()=>{const t=$('#jt').value.trim();if(!t)return;mine.push(t);LS.set('lg_jar_mine',mine);Net.send('jar',mine);sfx.pop();toast('Added to our jar 💕');addLove(2);quest('create');this.draw()};
    $$('[data-d]',el).forEach(b=>b.onclick=()=>{mine.splice(+b.dataset.d,1);LS.set('lg_jar_mine',mine);Net.send('jar',mine);this.draw()});
    this.paper(false)},
  snap(){return this.shown},restore(d){if(d){this.shown=d;this.paper(false)}},
  stop(){}};

/* ---------- Scratch card: scratch it TOGETHER ---------- */
let scCard=LS.get('lg_sc_cur',null);
Net.on('sc-new',d=>{scCard={msg:String(d.msg).slice(0,80),by:d.by};LS.set('lg_sc_cur',scCard);if(current==='scratch')Games.scratch.render();else toast(`🎟️ ${Net.partner} made a scratch card — open it together!`)});
Net.on('sc-s',d=>{if(current==='scratch')Games.scratch.remoteScratch(d)});
Net.on('sc-open',()=>{if(current==='scratch')Games.scratch.reveal(true)});
Games.scratch={title:'Scratch Card',
  start(el){this.el=el;this.render()},
  snap(){return scCard},restore(d){if(d&&(!scCard||scCard.msg!==d.msg)){scCard=d;LS.set('lg_sc_cur',d);this.render()}},
  render(){const el=this.el;this.opened=false;
    el.innerHTML=`<div class="center">${scCard?`<h3>🎟️ A card from ${esc(scCard.by===me.name?'you':scCard.by)}</h3><div class="scratchbox"><div class="msg">${esc(scCard.msg)}</div><canvas id="sc" width="340" height="190"></canvas></div><p class="note">You can <b>both</b> scratch at the same time — you'll see each other's scratches live ✨</p>`:'<p class="note">No card yet — write one below and it appears on both screens!</p>'}
      <hr style="border:0;border-top:3px dashed #fff;margin:18px 0"><h3>Make a new card 💌</h3>
      <div class="row" style="flex-wrap:nowrap"><input id="sm" maxlength="80" placeholder="A secret message for us…"><button class="btn" id="ss">Create</button></div></div>`;
    $('#ss').onclick=()=>{const m=$('#sm').value.trim();if(!m)return;scCard={msg:m,by:me.name};LS.set('lg_sc_cur',scCard);Net.send('sc-new',scCard);sfx.reveal();addLove(2);quest('create');this.render()};
    if(scCard)this.init()},
  init(){const c=$('#sc'),x=c.getContext('2d');this.x=x;this.c=c;
    const g=x.createLinearGradient(0,0,340,190);g.addColorStop(0,'#ff9ec4');g.addColorStop(1,'#9b7bff');x.fillStyle=g;x.fillRect(0,0,340,190);
    x.font='600 22px Fredoka';x.fillStyle='#fff';x.textAlign='center';x.fillText('✨ scratch me ✨',170,100);x.globalCompositeOperation='destination-out';
    let down=false,last=0;const pos=e=>{const r=c.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return[(p.clientX-r.left)/r.width,(p.clientY-r.top)/r.height]};
    const sc=e=>{if(!down)return;e.preventDefault();const[px,py]=pos(e);this.dot(px,py);const n=performance.now();if(n-last>25){last=n;Net.send('sc-s',{x:px,y:py})}if(Math.random()<.2)beep(900+Math.random()*300,.03,'triangle',.04);this.check()};
    ['mousedown','touchstart'].forEach(v=>c.addEventListener(v,e=>{down=true;sc(e)},{passive:false}));
    ['mouseup','mouseleave','touchend'].forEach(v=>c.addEventListener(v,()=>down=false));
    ['mousemove','touchmove'].forEach(v=>c.addEventListener(v,sc,{passive:false}))},
  dot(nx,ny){const x=this.x;if(!x)return;x.beginPath();x.arc(nx*340,ny*190,20,0,7);x.fill()},
  remoteScratch(d){this.dot(+d.x,+d.y);this.check()},
  check(){if(this.opened||!this.x)return;const d=this.x.getImageData(0,0,340,190).data;let n=0;for(let i=3;i<d.length;i+=16)if(d[i]===0)n++;if(n/(d.length/16)>.45){Net.send('sc-open');this.reveal(false)}},
  reveal(remote){if(this.opened||!this.c)return;this.opened=true;this.c.style.transition='opacity .6s';this.c.style.opacity=0;sfx.win();confetti(80);if(!remote)addLove(3)},
  stop(){}};

/* ---------- Fortune cookie: crack it TOGETHER ---------- */
Net.on('fc-crack',d=>{Games.fortune.f=d.text;if(current==='fortune')Games.fortune.draw(true)});
Games.fortune={title:'Love Fortune Cookie',
  start(el){this.el=el;this.f=null;this.draw()},
  snap(){return this.f?{text:this.f}:null},restore(d){if(d&&!this.f){this.f=d.text;this.draw()}},
  draw(remote){this.el.innerHTML=`<div class="center"><button class="cookie ${this.f?'crack':''}" id="ck">${this.f?'🥠':'🥠'}</button><p>${this.f?`Cracked together! ${esc(Net.connected?Net.partner:'')} sees it too 💞`:'Tap the cookie — it cracks on <b>both</b> screens!'}</p>
      ${this.f?`<div class="paper" style="font-size:26px">${esc(this.f)}</div><button class="btn ghost small" id="fa">Another 🥠</button>`:''}</div>`;
    $('#ck').onclick=()=>{if(this.f)return;this.f=FORT[Math.floor(Math.random()*FORT.length)];Net.send('fc-crack',{text:this.f});sfx.reveal();confetti(40);addLove(1);this.draw()};
    $('#fa')&&($('#fa').onclick=()=>{this.f=null;Net.send('fc-crack',{text:''});this.draw()});
    if(remote&&this.f){sfx.reveal();confetti(40)}},
  stop(){}};
/* an empty crack message just resets the cookie */
{const _fc=Net.handlers['fc-crack'];Net.on('fc-crack',d=>{if(!d.text){Games.fortune.f=null;if(current==='fortune')Games.fortune.draw();return}_fc(d)})}

/* ---------- Guess My Pick: the LIVE "how well do you know me?" ---------- */
const GWP=[
 ["My perfect weekend is…",["Cozy at home","Outdoor adventure","City & food","Beach trip"]],["My movie-night pick is…",["Rom-com","Horror","Action","Animated"]],
 ["My ideal breakfast is…",["Pancakes","Eggs","Cereal","I skip it"]],["I'm most of a…",["Early bird","Night owl","Both","Neither"]],
 ["My favourite season is…",["Spring","Summer","Autumn","Winter"]],["My comfort food is…",["Pizza","Ice cream","Pasta","Chocolate"]],
 ["My dream pet is…",["Dog","Cat","Bunny","Something exotic"]],["I'd pick the superpower of…",["Flying","Invisibility","Time travel","Mind reading"]],
 ["The love language I need most is…",["Words of affirmation","Quality time","Physical touch","Acts of service"]],["My ideal date is…",["Picnic","Fancy dinner","Concert","Staying in"]],
 ["My drink of choice is…",["Coffee","Tea","Hot chocolate","Water"]],["When texting I mostly send…",["Long paragraphs","Short bursts","Voice notes","Memes"]],
 ["My travel style is…",["Plan everything","Go with the flow","Luxury","Budget adventure"]],["When I'm stressed I…",["Talk it out","Need space","Eat","Sleep"]],
 ["My favourite music is…",["Pop","Rock","R&B","Chill / lo-fi"]],["The gift I'd love most is…",["Something handmade","A surprise trip","Something practical","Flowers"]],
 ["My weekend morning is…",["Sleep in","Workout","Brunch","Chores"]],["My pizza topping is…",["Pepperoni","Veggie","Pineapple","Plain cheese"]],
 ["My biggest fear is…",["Heights","Spiders","Being alone","Failure"]],["My dream home is…",["City flat","Countryside house","Beach villa","Cabin in the woods"]],
 ["My go-to snack is…",["Sweet","Salty","Spicy","Fruit"]],["At game night I'm the…",["Competitive one","Chill one","Cheater","Team player"]]];
Net.on('gp-start',d=>{if(current==='gwp')Games.gwp.begin(d.order)});
Net.on('gp-ready',d=>{const S=Games.gwp.s;if(current==='gwp'&&S&&S.r===d.r){S.ready=true;Games.gwp.draw()}});
Net.on('gp-guess',d=>{const S=Games.gwp.s;if(current!=='gwp'||!S||S.r!==d.r||S.pick===null)return;const ok=d.i===S.pick;Net.send('gp-res',{r:S.r,pick:S.pick,i:d.i,ok});Games.gwp.result(d.i,S.pick,ok)});
Net.on('gp-res',d=>{const S=Games.gwp.s;if(current==='gwp'&&S&&S.r===d.r)Games.gwp.result(d.i,d.pick,d.ok)});
Games.gwp={title:'Guess My Pick 🎯',
  start(el){this.el=el;this.s=null;this.menu()},
  menu(){this.el.innerHTML=`<div class="center"><p style="font-size:18px">Live "how well do you know me?" — each round one of you <b>secretly picks</b> the answer that fits <i>them</i>, and the other <b>guesses</b> it. Then you swap! 🎯💞</p>
    ${Net.connected?'':'<p class="note">Connect with your love to play.</p>'}<button class="btn" id="gp-go">▶ Start (10 rounds)</button></div>`;
    $('#gp-go').onclick=()=>{if(!Net.connected){toast('Connect with your love to play 💞');return}if(!partnerHere('gwp'))return;const order=shuffle(GWP.map((_,i)=>i)).slice(0,10);Net.send('gp-start',{order});this.begin(order)}},
  begin(order){this.s={order,r:0,know:0,they:0,pick:null,ready:false,done:false};this.draw()},
  asker(){return this.s.r%2===0?'host':'guest'},
  draw(){const S=this.s;if(!S||current!=='gwp')return;if(S.r>=10)return this.finish();const q=GWP[S.order[S.r]],iAsk=this.asker()===Net.role;S.iAsk=iAsk;
    const head=`<div class="scores"><div class="score">You guessed: ${S.know}</div><div class="score">${esc(Net.partner)} guessed: ${S.they}</div></div><div class="progress"><i style="width:${S.r/10*100}%"></i></div>`;
    this.el.innerHTML=`${head}<div class="qcard"><span class="cat">Round ${S.r+1}/10 · ${iAsk?'🤫 Secretly pick YOUR answer':`🎯 Guess ${esc(Net.partner)}'s answer`}</span><h2>${esc(q[0])}</h2></div>
      <div class="gpick">${q[1].map((o,i)=>`<button class="opt" data-i="${i}" ${(iAsk&&S.pick!==null)||(!iAsk&&!S.ready)||S.done?'disabled':''}>${esc(o)}</button>`).join('')}</div>
      <div class="status" id="gp-s">${S.done?'':iAsk?(S.pick===null?'Tap the one that\'s most YOU':`Locked in! Waiting for ${esc(Net.partner)} to guess… 👀`):(S.ready?'They\'ve picked! Take your best guess 💭':`${esc(Net.partner)} is choosing… 🤫`)}</div>`;
    if(S.pick!==null&&iAsk)$$('.opt')[S.pick]?.classList.add('picked');
    $$('.opt',this.el).forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(S.done)return;
      if(iAsk){if(S.pick!==null)return;S.pick=i;Net.send('gp-ready',{r:S.r});sfx.pop();this.draw()}
      else{if(!S.ready)return;S.done=true;Net.send('gp-guess',{r:S.r,i});$$('.opt').forEach(x=>x.disabled=true);$('#gp-s').textContent='Waiting for the reveal…'}})},
  result(guess,pick,ok){const S=this.s;if(S.done&&S.revealed)return;S.done=true;S.revealed=true;const q=GWP[S.order[S.r]];
    if(ok){S.iAsk?S.they++:S.know++;sfx.win();confetti(40)}else sfx.bad();
    $$('.opt',this.el).forEach((b,i)=>{b.disabled=true;if(i===pick)b.classList.add('good');else if(i===guess)b.classList.add('bad')});
    $('#gp-s').innerHTML=ok?(S.iAsk?`🎉 ${esc(Net.partner)} knows you so well!`:'🎉 You know them so well!'):(S.iAsk?`😜 ${esc(Net.partner)} guessed "${esc(q[1][guess])}" — but it was "${esc(q[1][pick])}"`:`Not quite! They picked "${esc(q[1][pick])}" 💗`);
    const r=S.r;setTimeout(()=>{if(current!=='gwp'||this.s!==S||S.r!==r)return;S.r++;S.pick=null;S.ready=false;S.done=false;S.revealed=false;this.draw()},2800)},
  finish(){const S=this.s;sfx.win();confetti(100);addLove(8);
    this.el.innerHTML=`<div class="center"><div class="big-heart">🎯</div><h2>Round over!</h2><p style="font-size:20px">You guessed <b>${S.know}/5</b> · ${esc(Net.partner)} guessed <b>${S.they}/5</b></p>
      <p>${S.know+S.they>=8?'You two are basically mind readers 😍':S.know+S.they>=5?'Nice — you really know each other 🥰':'Time for more late-night talks 😘'}</p><button class="btn" id="gp-a">Play again</button></div>`;$('#gp-a').onclick=()=>this.menu()},
  stop(){}};

/* first run */
checkBadges();
