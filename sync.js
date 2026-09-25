/* ==========================================================================
   Our Little Arcade — sync.js
   ONE shared save for the couple, no matter who creates the room.

   Every piece of progress is stored on BOTH devices. Whenever you connect
   (Day 1 you host, Day 2 they host — it makes no difference) each device sends
   its whole save and both merge with rules that can't lose anything:
     max    – love points, personal bests
     union  – badges, streak days, games played
     maxobj – counters (stats)
     flags  – daily quests (done for either = done for both)
     lww    – newest edit wins (countdown date, days-together, spinner ideas)
     hist   – Deep Talk scrapbook (perspective flipped for the other person)
     gd     – Love Garden campaign progress
   While you play, changes are pushed live too. Photos, letters, jars and
   quizzes you own are restored from your partner's copy if your device lost them.
   ========================================================================== */
const SYNC_KEYS={lg_love:'max',lg_badges:'union',lg_days:'union',lg_played:'union',lg_stats:'maxobj',lg_meet:'lww',lg_since:'lww',lg_ideas:'lww',lg_sc_cur:'lww',
  lg_best_flappy:'max',lg_best_g2048:'max',lg_best_snake:'max',lg_hcbest:'max',lg_qa_hist:'hist',lg_gd:'gd'};
const syncKind=k=>SYNC_KEYS[k]||(/^lg_q_\d+$/.test(k)?'flags':null);
let syncApplying=false;
const _rawSet=LS.set.bind(LS);
const tsAll=()=>LS.get('lg_ts',{});

/* every local write to a synced key is time-stamped and pushed to the partner shortly after */
const syncQueue=new Set();let syncTimer=null;
LS.set=function(k,v){_rawSet(k,v);if(syncApplying)return;const kind=syncKind(k);if(!kind)return;
  const t=tsAll();t[k]=Date.now();_rawSet('lg_ts',t);syncQueue.add(k);clearTimeout(syncTimer);syncTimer=setTimeout(flushSync,600)};
function flushSync(){const t=tsAll();syncQueue.forEach(k=>{const v=LS.get(k,null);if(v!==null)Net.send('kv',{k,v,t:t[k]||0})});syncQueue.clear()}

/* ---------- merge rules ---------- */
function mergeHist(cur,inc){const out=cur.slice(),have=new Set(out.map(x=>x.id+'|'+x.date));let n=0;
  (Array.isArray(inc)?inc:[]).forEach(e=>{if(!e||!e.id||typeof e.q!=='string'||e.theirs==null||have.has(e.id+'|'+e.date))return;
    out.push({id:e.id,q:e.q.slice(0,300),mine:String(e.theirs).slice(0,600),theirs:String(e.mine).slice(0,600),who:Net.partner,date:e.date});have.add(e.id+'|'+e.date);n++});
  return n?out.slice(-300):cur}
function mergeKV(k,v,t){const kind=syncKind(k);if(!kind||v===undefined||v===null)return false;const cur=LS.get(k,null),ts=tsAll();let out=cur;
  switch(kind){
    case'max':if(+v>(+cur||0))out=+v;break;
    case'union':{const a=Array.isArray(cur)?cur.slice():[];(Array.isArray(v)?v:[]).forEach(x=>{if(!a.includes(x))a.push(x)});if(a.length!==(cur||[]).length)out=a;break}
    case'maxobj':{const o={...(cur||{})};let ch=false;Object.entries(v||{}).forEach(([kk,vv])=>{if((+vv||0)>(o[kk]||0)){o[kk]=+vv;ch=true}});if(ch)out=o;break}
    case'flags':{const o={...(cur||{})};let ch=false;Object.entries(v||{}).forEach(([kk,vv])=>{if(vv&&!o[kk]){o[kk]=vv;ch=true}});if(ch)out=o;break}
    case'lww':if((+t||0)>(ts[k]||0))out=v;break;
    case'hist':out=mergeHist(cur||[],v);break;
    case'gd':{const p=gdProg();let ch=false;if(+v.lv>p.lv){p.lv=Math.min(NLV,+v.lv);ch=true}
      Object.entries(v.stars||{}).forEach(([lv,s])=>{if((+s||0)>(p.stars[lv]||0)){p.stars[lv]=Math.min(3,+s);ch=true}});if(+v.end>p.end){p.end=+v.end;ch=true}
      if((+t||0)>(ts[k]||0)){if(+v.cur>=1&&+v.cur<=NLV+1&&v.cur!==p.cur){p.cur=+v.cur;ch=true}if(DIFF[v.diff]&&v.diff!==p.diff){p.diff=v.diff;ch=true}}
      if(ch)out=p;break}}
  if(JSON.stringify(out)===JSON.stringify(cur))return false;
  syncApplying=true;LS.set(k,out);syncApplying=false;
  if(kind==='lww'||kind==='gd'){const q=tsAll();q[k]=Math.max(+t||0,q[k]||0);_rawSet('lg_ts',q)}
  afterSync(k);return true}
function afterSync(k){try{
  if(k==='lg_love')renderLove();
  if(k==='lg_meet')renderCd();if(k==='lg_since')renderSince();
  if(!$('#hub').classList.contains('hidden')){renderToday();renderLove()}
  if(k==='lg_gd'&&current==='garden'&&!Games.garden.playing)Games.garden.menu();
  if(k==='lg_sc_cur'){scCard=LS.get('lg_sc_cur',null)}
  checkBadges()}catch(e){}}

Net.on('kv',d=>{if(d&&typeof d.k==='string')mergeKV(d.k,d.v,d.t)});
Net.on('kv-all',d=>{let n=0;Object.entries(d||{}).forEach(([k,o])=>{if(o&&mergeKV(k,o.v,o.t))n++});if(n)toast('💾 Synced your shared save ✨')});
function syncSnapshot(){const t=tsAll(),o={};Object.keys(SYNC_KEYS).forEach(k=>{const v=LS.get(k,null);if(v!==null)o[k]={v,t:t[k]||0}});
  [dayNum(),dayNum()-1].forEach(n=>{const k='lg_q_'+n,v=LS.get(k,null);if(v)o[k]={v,t:t[k]||0}});return o}

/* ---------- things each of you OWNS: restore from the other person's copy if lost ---------- */
Net.on('wall-have',d=>{const ids=new Set(Array.isArray(d)?d:[]);const miss=LS.get('lg_wall',[]).filter(x=>!ids.has(x.id)).slice(-25);if(miss.length)Net.send('wall-sync',miss)});
Net.on('lt-have',d=>{d=d||{};const inIds=new Set(d.in||[]),outIds=new Set(d.out||[]);
  const toInbox=LS.get('lg_lt_out',[]).filter(x=>!inIds.has(x.id));if(toInbox.length)Net.send('lt-sync',toInbox);       // letters I wrote that they haven't got
  const restore=LS.get('lg_lt_in',[]).filter(x=>!outIds.has(x.id)).map(x=>({id:x.id,label:x.label,text:x.text,unlock:x.unlock,from:x.from,ts:x.ts}));   // letters THEY wrote that they lost
  if(restore.length)Net.send('lt-restore',restore)});
Net.on('lt-restore',a=>{const out=LS.get('lg_lt_out',[]),ids=new Set(out.map(x=>x.id));let n=0;
  (Array.isArray(a)?a:[]).forEach(x=>{if(x&&/^[a-z0-9]{3,12}$/.test(x.id)&&x.text&&!ids.has(x.id)){out.push({id:x.id,label:String(x.label||'').slice(0,60),text:String(x.text).slice(0,1500),unlock:+x.unlock||0,from:String(x.from||me.name).slice(0,20),ts:+x.ts||Date.now()});n++}});
  if(n){_rawSet('lg_lt_out',out);if(current==='letters')Games.letters.render()}});
Net.on('restore-req',()=>Net.send('restore',{jar:jarTheirs,quiz:partnerQuiz,photos:partnerPhotos}));
Net.on('restore',d=>{if(!d)return;
  const jar=LS.get('lg_jar_mine',[]);let ch=false;(Array.isArray(d.jar)?d.jar:[]).forEach(t=>{if(typeof t==='string'&&t&&!jar.includes(t)){jar.push(t.slice(0,300));ch=true}});if(ch){LS.set('lg_jar_mine',jar);Net.send('jar',jar)}
  if(!(LS.get('lg_quiz',[]).length)&&Array.isArray(d.quiz)&&d.quiz.length){LS.set('lg_quiz',d.quiz.slice(0,40))}
  if(!(LS.get('lg_photos',[]).length)&&Array.isArray(d.photos)&&d.photos.length){LS.set('lg_photos',d.photos.filter(s=>typeof s==='string'&&s.startsWith('data:image/')).slice(0,8))}});

/* ---------- on every connect: exchange everything ---------- */
{const _oc5=onConnected;onConnected=function(){_oc5();
  Net.send('kv-all',syncSnapshot());
  Net.send('wall-have',LS.get('lg_wall',[]).map(x=>x.id));
  Net.send('lt-have',{in:LS.get('lg_lt_in',[]).map(x=>x.id),out:LS.get('lg_lt_out',[]).map(x=>x.id)});
  Net.send('restore-req')}}
