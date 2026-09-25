/* ==========================================================================
   LOVE GARDEN — co-op Plants vs Zombies (campaign edition)
   12 levels + Endless mode, 12 plants that unlock as you progress, 7 zombies.
   The host runs the simulation; the guest sends taps and mirrors snapshots.
   Progress (unlocked level, stars, endless record), the selected level and an
   auto-save of the battle in progress are saved AND synced between you both.
   ========================================================================== */
const GCOLS=7,GROWS=5,GCELL=64,GOFF=58,GW=GOFF+GCOLS*GCELL,GH=GROWS*GCELL;
const START=18,WAVE=24;

/* ---------- plants (order = unlock order; level N unlocks the first N+1) ---------- */
const PL={
  sun:{e:'🌻',n:'Sunflower',cost:50,hp:80,cd:5,d:'Makes 💗 love drops'},
  rose:{e:'🌹',n:'Rose Shooter',cost:100,hp:80,cd:5,d:'Shoots petals'},
  nut:{e:'🌰',n:'Nutty Wall',cost:50,hp:600,cd:20,d:'Tough blocker'},
  cherry:{e:'🍒',n:'Cherry Blast',cost:150,hp:1,cd:35,d:'Big explosion'},
  mine:{e:'🍓',n:'Berry Mine',cost:75,hp:60,cd:25,d:'Arms in 8s, then BOOM'},
  frost:{e:'❄️',n:'Frost Lily',cost:175,hp:80,cd:8,d:'Slows zombies'},
  twin:{e:'🌷',n:'Tulip Twins',cost:200,hp:80,cd:8,d:'Double shot'},
  daisy:{e:'🌼',n:'Daisy Healer',cost:100,hp:80,cd:8,d:'Heals plants nearby'},
  cactus:{e:'🌵',n:'Thorn Cactus',cost:125,hp:250,cd:12,d:'Hurts zombies that bite it'},
  lav:{e:'🪻',n:'Lavender Snooze',cost:125,hp:80,cd:15,d:'Puts zombies to sleep'},
  hib:{e:'🌺',n:'Hibiscus Sniper',cost:175,hp:80,cd:10,d:'Slow but powerful shot'},
  bloom:{e:'🌞',n:'Sun Queen',cost:150,hp:100,cd:10,d:'Makes double love drops'}};
const PKEYS=Object.keys(PL),PKI=k=>PKEYS.indexOf(k);
const plantsFor=lvl=>lvl>12?PKEYS:PKEYS.slice(0,Math.min(PKEYS.length,lvl+1));

/* ---------- zombies ---------- */
const ZB={
  z:{e:'🧟',hp:100,sp:.17,dmg:25},
  f:{e:'🧟‍♀️',hp:75,sp:.3,dmg:25},
  t:{e:'🧌',hp:450,sp:.11,dmg:30},
  h:{e:'🐸',hp:90,sp:.19,dmg:25,hop:1},      // hopper: leaps over the first plant it meets
  g:{e:'👻',hp:70,sp:.2,dmg:0,ghost:1},      // ghost: floats straight through plants
  b:{e:'👹',hp:1800,sp:.085,dmg:70},
  d:{e:'🐲',hp:4200,sp:.07,dmg:110}};
const ZK=Object.keys(ZB);

/* ---------- levels ---------- */
// mix: { zombieKey: [firstWave, weight] }   boss: zombies that arrive after the last wave
const LVL=[
 {n:'Sunny Meadow',th:'day',w:4,love:200,sky:1,cm:.7,hp:.9,mix:{z:[0,1]},boss:[],tip:'Sunflowers first, then Rose Shooters. Easy start!'},
 {n:'Rose Garden',th:'day',w:5,love:175,sky:1,cm:.85,hp:1,mix:{z:[0,4],f:[1,2]},boss:[],tip:'New: Nutty Wall — block them while your roses shoot.'},
 {n:'Picnic Park',th:'day',w:6,love:150,sky:1,cm:.95,hp:1,mix:{z:[0,4],f:[1,3],t:[3,1]},boss:[],tip:'New: Cherry Blast clears a crowd. Watch for 🧌 tanks!'},
 {n:'Hopper Hill',th:'day',w:6,love:150,sky:1,cm:1,hp:1,mix:{z:[0,3],f:[1,2],h:[1,3],t:[3,1]},boss:[],tip:'🐸 hoppers leap over your first plant. New: Berry Mine!'},
 {n:'Moonlit Lawn',th:'night',w:6,love:300,sky:0,cm:.9,hp:1,mix:{z:[0,4],f:[1,3],h:[2,2]},boss:[],tip:'Night: NO falling 💗! Only sunflowers make love. New: Frost Lily.'},
 {n:'Ghost Story',th:'night',w:7,love:300,sky:0,cm:1,hp:1,mix:{z:[0,3],g:[1,3],f:[2,2],t:[3,1]},boss:[],tip:'👻 ghosts float through plants — shoot them before the lawn mower!'},
 {n:'Sweet Surrender',th:'day',w:7,love:150,sky:1,cm:1.1,hp:1,mix:{z:[0,3],f:[1,2],t:[2,2],h:[2,2],g:[3,2]},boss:['b'],tip:'A 👹 boss at the end! New: Daisy Healer keeps your wall alive.'},
 {n:'Garden Party',th:'day',w:8,love:150,sky:1,cm:1.15,hp:1.05,mix:{z:[0,3],f:[1,3],t:[2,2],h:[2,2],g:[3,2]},boss:['b'],tip:'New: Thorn Cactus hurts every zombie that bites it.'},
 {n:'Twilight Terrace',th:'night',w:8,love:325,sky:0,cm:1.15,hp:1.1,mix:{z:[0,3],f:[1,3],t:[2,2],h:[2,2],g:[2,3]},boss:['b'],tip:'Night again. New: Lavender Snooze puts zombies to sleep.'},
 {n:'Storm Season',th:'storm',w:9,love:150,sky:1,cm:1.3,hp:1.1,mix:{z:[0,3],f:[1,3],t:[2,3],h:[2,3],g:[3,3]},boss:['b','b'],tip:'Two bosses! New: Hibiscus Sniper hits HARD from afar.'},
 {n:'Zombie Kingdom',th:'night',w:9,love:450,sky:0,cm:1.1,hp:1.1,mix:{z:[0,3],f:[1,3],t:[2,3],h:[2,3],g:[3,2]},boss:['b','b'],tip:'New: Sun Queen makes double 💗 — build your economy early.'},
 {n:'The Grumpy Dragon',th:'storm',w:10,love:250,sky:1,cm:1.3,hp:1.15,mix:{z:[0,3],f:[1,3],t:[2,3],h:[2,3],g:[3,3]},boss:['d'],tip:'FINAL BOSS: 🐲 the Grumpy Dragon. Use everything you have!'}];
const ENDLESS={n:'Endless Garden',th:'night',w:0,love:250,sky:1,cm:1,hp:1,endless:1,mix:{z:[0,4],f:[1,3],h:[2,3],g:[3,2],t:[3,2]},boss:[],tip:'How many waves can you survive together? Zombies keep getting stronger!'};
const NLV=LVL.length;
const lvCfg=n=>n>NLV?ENDLESS:LVL[n-1];
const THEME={day:['#a8e6a3','#9ad995','#d9c7a8'],night:['#4c7d70','#437061','#6b5a45'],storm:['#8dc09a','#80b38c','#c9b99b']};
const DIFF={easy:{hp:.75,c:.8,love:1.25,i:1,lbl:'😌 Easy'},normal:{hp:1,c:1,love:1,i:2,lbl:'😎 Normal'},hard:{hp:1.7,c:1.6,love:.75,i:3,lbl:'😈 Hard'}};

/* ---------- saved progress (synced between both of you) ---------- */
const gdProg=()=>{const p=LS.get('lg_gd',null)||{};return{lv:p.lv||1,stars:p.stars||{},end:p.end||0,cur:p.cur||1,diff:p.diff||'normal'}};
const gdSetProg=p=>LS.set('lg_gd',p);
function gdMerge(inc){if(!inc)return false;const p=gdProg();let ch=false;
  if(+inc.lv>p.lv){p.lv=Math.min(NLV,+inc.lv);ch=true}
  Object.entries(inc.stars||{}).forEach(([k,v])=>{if((+v||0)>(p.stars[k]||0)){p.stars[k]=Math.min(3,+v);ch=true}});
  if(+inc.end>p.end){p.end=+inc.end;ch=true}
  if(ch)gdSetProg(p);return ch}
const gdSave=()=>LS.get('lg_gd_save',null);
function gdWriteSave(o){if(o){const s=JSON.stringify(o);if(s.length>90000)return;LS.set('lg_gd_save',o)}else try{localStorage.removeItem('lg_gd_save')}catch{}}
Net.on('gd-prog',d=>{if(gdMerge(d)&&current==='garden'&&!Games.garden.playing)Games.garden.menu()});
Net.on('gd-sel',d=>{const p=gdProg();if(+d.cur>=1&&+d.cur<=NLV+1)p.cur=+d.cur;if(DIFF[d.diff])p.diff=d.diff;gdSetProg(p);if(current==='garden'&&!Games.garden.playing)Games.garden.menu()});
Net.on('gd-save',d=>{gdWriteSave(d);if(current==='garden'&&!Games.garden.playing)Games.garden.menu()});
{const _oc4=onConnected;onConnected=function(){_oc4();const p=gdProg();Net.send('gd-prog',p);const s=gdSave();if(s)Net.send('gd-save',s);
  if(Net.role==='host')Net.send('gd-sel',{cur:p.cur,diff:p.diff})}}   // the room creator's selected level is what you both start from

/* ---------- messages ---------- */
Net.on('gd-req',d=>{if(current==='garden'&&Net.role==='host'&&!Games.garden.playing)Games.garden.hostStart(+d.lvl||1,d.diff,!!d.resume)});
Net.on('gd-begin',d=>{if(current==='garden')Games.garden.viewStart(+d.lvl||1,d.diff)});
Net.on('gd-st',s=>{const g=Games.garden;if(current==='garden'&&g.playing&&!g.isHost){g.RS=s}});
Net.on('gd-tap',d=>{const g=Games.garden;if(current==='garden'&&g.playing&&g.isHost)g.doTap(+d.x,+d.y,String(d.sel))});
Net.on('gd-quit',()=>{const g=Games.garden;if(current==='garden'&&g.playing&&!g.isHost){g.halt();toast(`${Net.partner} left the garden — your progress is saved 💾`);g.menu()}});

/* ---------- spawn tables ---------- */
function waveSpawns(L,w){const base=START+w*WAVE,n=Math.max(1,Math.round((2+w*1.5)*L.cm*(this_dm.c))),opts=Object.entries(L.mix).filter(([k,v])=>w>=v[0]),tot=opts.reduce((a,[k,v])=>a+v[1],0),out=[];
  for(let i=0;i<n;i++){let r=Math.random()*tot,k=opts[0][0];for(const[kk,v]of opts){r-=v[1];if(r<=0){k=kk;break}}out.push({t:base+Math.random()*(WAVE-2),lane:Math.floor(Math.random()*GROWS),k,w})}return out}
let this_dm={c:1};   // set by hostStart before generating

Games.garden={title:'Love Garden 🌻🧟',playing:false,isHost:true,sel:'rose',lvl:1,
  start(el){this.el=el;this.halt();this.menu()},
  snap(){return this.playing&&this.isHost?{lvl:this.lvl,diff:this.diff}:null},
  restore(d){if(d&&!this.playing&&!(Net.role==='host'))this.viewStart(+d.lvl||1,d.diff)},
  /* ---------- level select ---------- */
  menu(){this.halt();const P=gdProg(),guest=Net.connected&&Net.role!=='host',cur=Math.min(P.cur,P.lv>=NLV&&P.stars[NLV]?NLV+1:P.lv),L=lvCfg(cur),sv=gdSave();
    const endOk=!!P.stars[NLV],newP=cur<=NLV&&PKEYS[cur]?PL[PKEYS[cur]]:null;
    this.el.innerHTML=`<div class="center"><p style="font-size:17px">Zombies 🧟 are stealing your love letters! Plant flowers on the <b>shared lawn</b> — you <b>both</b> play at once and share the 💗. <b>Beat a level to unlock the next one and a new plant!</b></p>
      <p class="note">💾 Progress is saved and shared: next time, you both start right here.${guest?` ${esc(Net.partner)} runs the battle.`:''}</p></div>
      <div class="lvgrid">${LVL.map((l,i)=>{const n=i+1,lock=n>P.lv,st=P.stars[n]||0;return `<button class="lvbtn ${n===cur?'sel':''} ${lock?'lock':''}" data-l="${n}" ${lock?'disabled':''}><small>${lock?'🔒':{day:'☀️',night:'🌙',storm:'⛈️'}[l.th]}</small><b>${n}</b><span>${'⭐'.repeat(st)||'&nbsp;'}</span></button>`}).join('')}
        <button class="lvbtn ${cur>NLV?'sel':''} ${endOk?'':'lock'}" data-l="${NLV+1}" ${endOk?'':'disabled'}><small>${endOk?'♾️':'🔒'}</small><b>∞</b><span>${P.end?'Best '+P.end:'&nbsp;'}</span></button></div>
      <div class="qcard" style="margin:12px 0"><span class="cat">${cur>NLV?'Endless':'Level '+cur} · ${{day:'☀️ Day',night:'🌙 Night',storm:'⛈️ Storm'}[L.th]}</span><h2>${esc(L.n)}</h2>
        <p class="note" style="margin:6px 0">${cur>NLV?'Waves never stop!':`${L.w} waves${L.boss.length?' + boss':''}`} · ${L.sky?'💗 falls from the sky':'⚠️ no sky love — only sunflowers!'}</p><p>${esc(L.tip)}</p>
        <div style="font-size:26px;letter-spacing:4px">${plantsFor(cur).map(k=>PL[k].e).join(' ')}</div>${newP?`<p class="note">✨ Newest plant: ${newP.e} <b>${esc(newP.n)}</b> — ${esc(newP.d)}</p>`:''}</div>
      <div class="row" style="justify-content:center">${Object.entries(DIFF).map(([k,v])=>`<button class="btn small ${P.diff===k?'':'ghost'}" data-df="${k}">${v.lbl}</button>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:12px">
        ${sv?`<button class="btn mint" id="gd-res">▶ Resume ${sv.lvl>NLV?'Endless':'Level '+sv.lvl} (saved)</button>`:''}
        <button class="btn" id="gd-go">${sv?'🔄 New game':'▶ Start'} ${cur>NLV?'Endless':'Level '+cur}</button></div>
      ${guest?`<p class="note center">Tap Start and ${esc(Net.partner)}'s garden begins — they need to have Love Garden open.</p>`:''}`;
    $$('.lvbtn',this.el).forEach(b=>b.onclick=()=>{sfx.tap();const p=gdProg();p.cur=+b.dataset.l;gdSetProg(p);Net.send('gd-sel',{cur:p.cur,diff:p.diff});this.menu()});
    $$('[data-df]',this.el).forEach(b=>b.onclick=()=>{sfx.tap();const p=gdProg();p.diff=b.dataset.df;gdSetProg(p);Net.send('gd-sel',{cur:p.cur,diff:p.diff});this.menu()});
    const go=resume=>{sfx.pop();if(!partnerHere('garden'))return;const lv=resume?sv.lvl:cur,df=resume?sv.diff:P.diff;
      if(guest){Net.send('gd-req',{lvl:lv,diff:df,resume});toast(`Asked ${Net.partner} to start… make sure they've opened Love Garden 🌻`)}else this.hostStart(lv,df,resume)};
    $('#gd-go').onclick=()=>go(false);$('#gd-res')&&($('#gd-res').onclick=()=>go(true))},
  /* ---------- start / stop ---------- */
  hostStart(lvl,diff,resume){this.halt();const dm=DIFF[diff]||DIFF.normal;this.diff=DIFF[diff]?diff:'normal';this_dm=dm;let G=null;
    const sv=gdSave();
    if(resume&&sv&&sv.G){G=sv.G;lvl=sv.lvl;this.diff=sv.diff;this_dm=DIFF[this.diff]||DIFF.normal}
    this.lvl=lvl;const L=lvCfg(lvl);
    if(!G){G=this.newState(L,lvl,dm)}
    this.G=G;Net.send('gd-begin',{lvl,diff:this.diff});
    const p=gdProg();p.cur=lvl;p.diff=this.diff;gdSetProg(p);Net.send('gd-sel',{cur:lvl,diff:this.diff});
    this.isHost=true;this.build()},
  newState(L,lvl,dm){const G={t:0,love:Math.round(L.love*dm.love),plants:[],zs:[],sh:[],su:[],fx:[],mo:Array.from({length:GROWS},(_,r)=>({r,x:-.55,a:false,used:false})),cds:{},nid:1,sky:5,kills:0,spawns:[],si:0,over:null,msg:'',msgT:0,mk:0,lvl,dm:this.diff,wi:0,endless:!!L.endless};
    if(!L.endless){for(let w=0;w<L.w;w++)G.spawns.push(...waveSpawns(L,w));
      L.boss.forEach((k,i)=>G.spawns.push({t:START+L.w*WAVE+i*6,lane:i%2?1:3,k,w:L.w}));G.spawns.sort((a,b)=>a.t-b.t);G.total=G.spawns.length}
    G.marks=[[START,'🧟 Here they come!']];if(!L.endless){if(L.w>=4)G.marks.push([START+Math.floor(L.w/2)*WAVE,'🚩 A huge wave is approaching!']);G.marks.push([START+(L.w-1)*WAVE,'🚩 FINAL WAVE!']);if(L.boss.length)G.marks.push([START+L.w*WAVE,L.boss[0]==='d'?'🐲 THE GRUMPY DRAGON!':'👹 The BOSS is here!'])}
    return G},
  viewStart(lvl,diff){this.halt();this.lvl=lvl;this.diff=DIFF[diff]?diff:'normal';this.isHost=false;this.RS=null;this.build()},
  halt(){this.playing=false;cancelAnimationFrame(this.raf);this.done=false},
  stop(){if(this.playing&&this.isHost){this.persist();Net.send('gd-quit')}this.halt()},
  persist(){const G=this.G;if(!G||G.over)return;const o={lvl:this.lvl,diff:this.diff,G};gdWriteSave(o);Net.send('gd-save',o)},
  /* ---------- play UI ---------- */
  build(){this.playing=true;this.done=false;this.acc=0;this.saveT=0;this.avail=plantsFor(this.lvl);if(!this.avail.includes(this.sel))this.sel=this.avail.includes('rose')?'rose':this.avail[0];
    const L=lvCfg(this.lvl);this.L=L;
    this.el.innerHTML=`<div class="gd-top"><div class="gd-love" id="gd-l">💗 0</div><div class="gd-msg" id="gd-m"></div><div class="note" id="gd-w">${this.lvl>NLV?'Endless':'Level '+this.lvl}</div></div>
      <div class="gd-bar"><i id="gd-p" style="width:0%"></i></div>
      <div class="gd-seeds" id="gd-sd">${this.avail.map(k=>`<button class="seed" data-k="${k}" title="${PL[k].n} — ${PL[k].d}"><b>${PL[k].e}</b>💗${PL[k].cost}<span class="cd"></span></button>`).join('')}<button class="seed" data-k="shovel" title="Remove a plant"><b>🥄</b>Remove<span class="cd"></span></button></div>
      <canvas id="gdcv" width="${GW}" height="${GH}"></canvas><p class="note center" id="gd-h">${esc(L.n)} — ${this.isHost?'you run the battle · ':''}tap a seed, then the lawn · tap 💗 to collect${this.isHost?' · 💾 auto-saves':''}</p>
      <div class="gd-desc note center" id="gd-d"></div>`;
    this.cv=$('#gdcv');this.ctx=this.cv.getContext('2d');
    $$('#gd-sd .seed').forEach(b=>b.onclick=()=>{this.sel=b.dataset.k;sfx.tap();const P=PL[b.dataset.k];$('#gd-d').textContent=P?`${P.e} ${P.n}: ${P.d}`:'🥄 Tap a plant to remove it';this.ui()});
    this.cv.onpointerdown=e=>{e.preventDefault();const r=this.cv.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*GW,py=(e.clientY-r.top)/r.height*GH;this.tap((px-GOFF)/GCELL,py/GCELL)};
    this.last=performance.now();this.raf=requestAnimationFrame(t=>this.loop(t))},
  tap(x,y){if(!this.playing)return;if(this.isHost||!Net.connected)this.doTap(x,y,this.sel);else Net.send('gd-tap',{x,y,sel:this.sel})},
  doTap(x,y,sel){const G=this.G;if(!G||G.over)return;
    let best=null,bd=.8;G.su.forEach(s=>{const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=s}});
    if(best){G.love+=best.v;G.su=G.su.filter(s=>s!==best);sfx.pop();return}
    const c=Math.floor(x),r=Math.floor(y);if(c<0||c>=GCOLS||r<0||r>=GROWS)return;
    const ex=G.plants.find(p=>p.r===r&&p.c===c);
    if(sel==='shovel'){if(ex){G.plants=G.plants.filter(p=>p!==ex);sfx.tap()}return}
    const P=PL[sel];if(!P||ex||!plantsFor(G.lvl).includes(sel))return;if(G.love<P.cost||(G.cds[sel]||0)>0){sfx.bad();return}
    G.love-=P.cost;G.cds[sel]=P.cd;G.plants.push({r,c,k:sel,hp:P.hp,mhp:P.hp,tm:sel==='sun'?6:sel==='bloom'?7:sel==='cherry'?.9:sel==='mine'?8:sel==='daisy'?1:sel==='lav'?2:0,burst:0,bt:0});sfx.match()},
  /* ---------- simulation (host only) ---------- */
  step(dt){const G=this.G,L=this.L;if(G.over)return;G.t+=dt;const dm=DIFF[G.dm]||DIFF.normal;this_dm=dm;
    if(G.endless){while(G.t>=START+(G.wi-1)*WAVE){G.spawns.push(...waveSpawns(L,G.wi));if((G.wi+1)%5===0)G.spawns.push({t:START+G.wi*WAVE+10,lane:2,k:(G.wi+1)%10===0?'d':'b',w:G.wi});G.wi++;G.spawns.sort((a,b)=>a.t-b.t)}
      const w=Math.floor((G.t-START)/WAVE)+1;while(G.mk<w&&G.mk<999){G.mk++;if(G.mk>=2&&G.mk%5===0){G.msg='🚩 Wave '+G.mk+' — a boss is coming!';G.msgT=4}}}
    while(G.si<G.spawns.length&&G.spawns[G.si].t<=G.t){const s=G.spawns[G.si++],z=ZB[s.k],hm=G.endless?1+.07*(s.w||0):1,hp=z.hp*dm.hp*(L.hp||1)*hm;G.zs.push({id:G.nid++,r:s.lane,x:GCOLS+.4,k:s.k,hp,mhp:hp,slow:0,sleep:0,vx:z.sp,hopped:false})}
    if(!G.endless){while(G.mk<G.marks.length&&G.t>=G.marks[G.mk][0]){G.msg=G.marks[G.mk][1];G.msgT=4;G.mk++}}
    if(G.msgT>0)G.msgT-=dt;if(G.msgT<=0)G.msg='';
    if(L.sky){G.sky-=dt;if(G.sky<=0){G.sky=8+Math.random()*3;G.su.push({id:G.nid++,x:.5+Math.random()*(GCOLS-1),y:-.4,ty:.6+Math.random()*(GROWS-1),life:12,v:25})}}
    PKEYS.forEach(k=>G.cds[k]=Math.max(0,(G.cds[k]||0)-dt));
    const fire=(p,k)=>G.sh.push({r:p.r,x:p.c+.9,k}),drop=(x,y)=>G.su.push({id:G.nid++,x,y:y-.4,ty:y,life:10,v:25});
    G.plants.slice().forEach(p=>{const k=p.k;
      if(k==='sun'||k==='bloom'){p.tm-=dt;if(p.tm<=0){p.tm=12;drop(p.c+.5,p.r+.6);if(k==='bloom')drop(p.c+.8,p.r+.7)}}
      else if(k==='cherry'){p.tm-=dt;if(p.tm<=0){G.zs.forEach(z=>{if(Math.abs(z.r-p.r)<=1&&Math.abs(z.x-(p.c+.5))<=1.7)z.hp-=350});G.fx.push({x:p.c+.5,y:p.r+.5,ttl:.5,e:'💥'});G.plants=G.plants.filter(q=>q!==p)}}
      else if(k==='mine'){if(p.tm>0)p.tm-=dt;else{const hit=G.zs.find(z=>z.r===p.r&&z.hp>0&&!ZB[z.k].ghost&&Math.abs(z.x-(p.c+.5))<.7);
        if(hit){G.zs.forEach(z=>{if(z.r===p.r&&Math.abs(z.x-(p.c+.5))<1.3)z.hp-=450});G.fx.push({x:p.c+.5,y:p.r+.5,ttl:.5,e:'💥'});G.plants=G.plants.filter(q=>q!==p)}}}
      else if(k==='daisy'){p.tm-=dt;if(p.tm<=0){p.tm=1;G.plants.forEach(q=>{if(q!==p&&Math.abs(q.r-p.r)<=1&&Math.abs(q.c-p.c)<=1)q.hp=Math.min(q.mhp,q.hp+10)})}}
      else if(k==='lav'){p.tm-=dt;if(p.tm<=0){const near=G.zs.filter(z=>z.hp>0&&Math.abs(z.r-p.r)<=1&&z.x>p.c&&z.x<p.c+3.6);if(near.length){near.forEach(z=>z.sleep=2.5);G.fx.push({x:p.c+1.5,y:p.r+.5,ttl:.5,e:'💤'});p.tm=6}else p.tm=.5}}
      else if(k==='nut'||k==='cactus'){}
      else{p.tm-=dt;const has=G.zs.some(z=>z.r===p.r&&z.x>p.c+.4&&z.x<GCOLS+.2&&z.hp>0);
        if(p.burst>0){p.bt-=dt;if(p.bt<=0){fire(p,'p');p.burst--;p.bt=.16}}
        if(p.tm<=0&&has){p.tm=k==='frost'?1.6:k==='hib'?2.8:1.4;fire(p,k==='frost'?'f':k==='hib'?'h':'p');if(k==='twin'){p.burst=1;p.bt=.16}}}});
    G.zs.forEach(z=>{if(z.hp<=0)return;const zt=ZB[z.k];z.slow=Math.max(0,z.slow-dt);z.sleep=Math.max(0,(z.sleep||0)-dt);
      if(z.sleep>0)z.vx=0;else{let eat=null;
        if(!zt.ghost){const lane=G.plants.filter(p=>p.r===z.r).sort((a,b)=>b.c-a.c);for(const p of lane){if(z.x<=p.c+.95&&z.x>p.c-.2){eat=p;break}}}
        if(eat&&zt.hop&&!z.hopped){z.hopped=true;z.x-=1.3;eat=null}
        if(eat){eat.hp-=zt.dmg*dt;if(eat.k==='cactus')z.hp-=18*dt;z.vx=0;if(eat.hp<=0)G.plants=G.plants.filter(p=>p!==eat)}
        else{z.vx=zt.sp*(z.slow>0?.5:1);z.x-=z.vx*dt}}
      if(z.x<0){const m=G.mo[z.r];if(!m.used){m.used=true;m.a=true;sfx.boom()}else if(!m.a&&z.x<-.6)G.over='lose'}});
    G.mo.forEach(m=>{if(!m.a)return;m.x+=7*dt;G.zs.forEach(z=>{if(z.r===m.r&&z.hp>0&&Math.abs(z.x-m.x)<.6)z.hp=0});if(m.x>GCOLS+.8)m.a=false});
    G.sh.forEach(s=>{s.x+=(s.k==='h'?5:4.2)*dt;const h=G.zs.find(z=>z.r===s.r&&z.hp>0&&Math.abs(z.x-s.x)<.3);if(h){h.hp-=s.k==='f'?10:s.k==='h'?55:20;if(s.k==='f')h.slow=3;s.dead=true}if(s.x>GCOLS+.8)s.dead=true});
    G.sh=G.sh.filter(s=>!s.dead);
    const before=G.zs.length;G.zs=G.zs.filter(z=>z.hp>0);G.kills+=before-G.zs.length;
    G.su.forEach(s=>{if(s.y<s.ty)s.y=Math.min(s.ty,s.y+1.3*dt);else s.life-=dt});G.su=G.su.filter(s=>s.life>0);
    G.fx.forEach(f=>f.ttl-=dt);G.fx=G.fx.filter(f=>f.ttl>0);
    if(!G.over&&!G.endless&&G.si>=G.spawns.length&&G.zs.length===0)G.over='win'},
  snapshot(){const G=this.G,L=this.L,w=G.endless?Math.max(0,Math.floor((G.t-START)/WAVE)+1):(G.t<START?0:Math.min(L.w,Math.floor((G.t-START)/WAVE)+1));
    return{lvl:G.lvl,love:Math.floor(G.love),cds:Object.fromEntries(this.avail.map(k=>[k,+(G.cds[k]||0).toFixed(1)])),
      pl:G.plants.map(p=>[p.r,p.c,PKI(p.k),Math.round(p.hp/p.mhp*100),p.k==='mine'?(p.tm<=0?1:0):0]),
      zs:G.zs.map(z=>[z.id,z.r,+z.x.toFixed(2),ZK.indexOf(z.k),Math.round(z.hp/z.mhp*100),(z.slow>0?1:0)|(z.sleep>0?2:0),+z.vx.toFixed(3)]),
      sh:G.sh.map(s=>[s.r,+s.x.toFixed(2),s.k==='f'?1:s.k==='h'?2:0]),su:G.su.map(s=>[s.id,+s.x.toFixed(2),+s.y.toFixed(2)]),
      mo:G.mo.map(m=>[m.r,+m.x.toFixed(2),m.a?1:0,m.used?1:0]),fx:G.fx.map(f=>[f.x,f.y,+f.ttl.toFixed(2),f.e||'💥']),
      wave:w,lw:G.endless?0:L.w,left:G.endless?G.zs.length+(G.spawns.length-G.si):G.total-G.si+G.zs.length,total:G.endless?0:G.total,kills:G.kills,msg:G.msg,over:G.over}},
  /* ---------- main loop ---------- */
  loop(now){if(current!=='garden'||!this.playing)return;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;
    if(this.isHost){this.step(dt);this.RS=this.snapshot();this.acc+=dt;if(this.acc>=.1||this.RS.over){this.acc=0;Net.send('gd-st',this.RS)}
      this.saveT+=dt;if(this.saveT>=4){this.saveT=0;this.persist()}}
    else if(this.RS){const s=this.RS;s.zs.forEach(z=>z[2]-=z[6]*dt);s.sh.forEach(h=>h[1]+=(h[2]===2?5:4.2)*dt);s.mo.forEach(m=>{if(m[2])m[1]+=7*dt});s.fx.forEach(f=>f[2]-=dt)}
    if(this.RS){this.draw(this.RS);this.ui();if(this.RS.over&&!this.done)this.finish(this.RS.over)}
    if(this.playing)this.raf=requestAnimationFrame(t=>this.loop(t))},
  ui(){const s=this.RS;if(!s)return;const l=$('#gd-l');if(!l)return;l.textContent='💗 '+s.love;
    $('#gd-m').textContent=s.msg||'';
    $('#gd-w').textContent=s.lw?`Lv ${s.lvl} · Wave ${s.wave}/${s.lw} · 🧟 ${s.left}`:`Endless · Wave ${s.wave} · 🧟 ${s.left}`;
    $('#gd-p').style.width=(s.lw?(s.total?(1-s.left/s.total)*100:0):Math.min(100,s.wave*5))+'%';
    $$('#gd-sd .seed').forEach(b=>{const k=b.dataset.k;b.classList.toggle('sel',this.sel===k);if(k==='shovel')return;const P=PL[k];b.classList.toggle('poor',s.love<P.cost);b.querySelector('.cd').style.height=((s.cds[k]||0)/P.cd*100)+'%'})},
  /* ---------- results + save progress ---------- */
  finish(res){this.done=true;const win=res==='win',s=this.RS,lvl=this.lvl,endless=lvl>NLV;cancelAnimationFrame(this.raf);this.playing=false;
    gdWriteSave(null);if(this.isHost)Net.send('gd-save',null);
    const P=gdProg();let newPlant=null,extra='';
    if(win&&!endless){const st=DIFF[this.diff].i;if(st>(P.stars[lvl]||0))P.stars[lvl]=st;
      if(lvl===P.lv&&P.lv<NLV){P.lv++;if(PKEYS[P.lv])newPlant=PL[PKEYS[P.lv]]}
      P.cur=Math.min(lvl+1,NLV);
      sfx.win();confetti(160);addLove(20+lvl*2);stat('garden')}
    else if(endless){if(s&&s.wave>P.end)P.end=s.wave;sfx.win();confetti(60);addLove(Math.min(30,s?s.wave*2:0));extra=`<p>You survived <b>${s?s.wave:0}</b> waves! Best: ${P.end}</p>`}
    else{sfx.bad();addLove(3)}
    gdSetProg(P);if(this.isHost)Net.send('gd-prog',P);setTimeout(checkBadges,400);
    const nextLv=Math.min(lvl+1,NLV+ (P.stars[NLV]?1:0));
    this.el.innerHTML=`<div class="center"><div class="big-heart">${win?'🏆':endless?'♾️':'💔'}</div><h2>${win?'You saved the love letters!':endless?'The zombies finally got in!':'The zombies got in…'}</h2>
      ${win?`<p>${'⭐'.repeat(DIFF[this.diff].i)} Level ${lvl} cleared — amazing teamwork! 🌻💞</p>`:endless?'':'<p>So close! More sunflowers early helps 🌻</p>'}${extra}
      ${newPlant?`<div class="qcard"><span class="cat">✨ NEW PLANT UNLOCKED!</span><h2>${newPlant.e} ${esc(newPlant.n)}</h2><p>${esc(newPlant.d)}</p></div>`:''}
      ${win&&lvl===NLV&&P.stars[NLV]?'<p><b>🐲 You beat the Grumpy Dragon!</b> Endless mode is now unlocked ♾️</p>':''}
      <p class="note">Zombies defeated: ${s?s.kills:0} · 💾 Progress saved for you both</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="gd-a">${win?'Replay':'Retry'}</button>${win&&!endless&&lvl<NLV?`<button class="btn" id="gd-n">Next level ▶</button>`:''}<button class="btn ghost" id="gd-m2">Level select</button></div></div>`;
    const setSel=n=>{const p=gdProg();p.cur=n;gdSetProg(p);Net.send('gd-sel',{cur:n,diff:p.diff})};
    $('#gd-a').onclick=()=>{setSel(lvl);this.menu()};$('#gd-n')&&($('#gd-n').onclick=()=>{setSel(nextLv);this.menu()});$('#gd-m2').onclick=()=>{setSel(win&&!endless?nextLv:lvl);this.menu()}},
  /* ---------- drawing ---------- */
  draw(s){const x=this.ctx;if(!x)return;const L=lvCfg(s.lvl||this.lvl),th=THEME[L.th]||THEME.day;x.clearRect(0,0,GW,GH);
    for(let r=0;r<GROWS;r++){x.fillStyle=th[2];x.fillRect(0,r*GCELL,GOFF,GCELL);for(let c=0;c<GCOLS;c++){x.fillStyle=(r+c)%2?th[1]:th[0];x.fillRect(GOFF+c*GCELL,r*GCELL,GCELL,GCELL)}}
    x.textAlign='center';x.textBaseline='middle';
    const px=v=>GOFF+v*GCELL;
    x.font='34px serif';x.fillText('🏠',GOFF/2,GH/2);
    s.mo.forEach(m=>{if(m[3]&&!m[2])return;x.font='34px serif';x.fillText('🚜',px(m[1]),m[0]*GCELL+GCELL/2)});
    const bar=(cx,cy,pct,w,col)=>{if(pct>=99)return;x.fillStyle='#0003';x.fillRect(cx-w/2,cy,w,5);x.fillStyle=col;x.fillRect(cx-w/2,cy,w*pct/100,5)};
    s.pl.forEach(p=>{const k=PKEYS[p[2]],cx=px(p[1]+.5),cy=p[0]*GCELL+GCELL/2;if(k==='mine'&&!p[4]){x.globalAlpha=.45;x.font='30px serif';x.fillText(PL[k].e,cx,cy+8);x.globalAlpha=1}else{x.font='44px serif';x.fillText(PL[k].e,cx,cy)}bar(cx,cy+26,p[3],40,'#5fd3b3')});
    s.zs.slice().sort((a,b)=>a[1]-b[1]).forEach(z=>{const cx=px(z[2]),cy=z[1]*GCELL+GCELL/2-2,zt=ZB[ZK[z[3]]];x.globalAlpha=zt.ghost?.7:1;x.font=(z[3]>=5?58:46)+'px serif';x.fillText(zt.e,cx,cy);x.globalAlpha=1;
      if(z[5]&1)x.fillText('🧊',cx+10,cy+16);if(z[5]&2){x.font='22px serif';x.fillText('💤',cx+14,cy-22)}bar(cx,cy-(z[3]>=5?38:32),z[4],z[3]>=5?50:36,'#ff6fa5')});
    s.sh.forEach(h=>{x.font=(h[2]===2?24:18)+'px serif';x.fillText(h[2]===1?'❄️':h[2]===2?'🌺':'🌸',px(h[1]),h[0]*GCELL+GCELL/2-6)});
    s.fx.forEach(f=>{x.globalAlpha=Math.max(0,f[2]*2);x.font=(110-f[2]*60)+'px serif';x.fillText(f[3],px(f[0]),f[1]*GCELL);x.globalAlpha=1});
    s.su.forEach(u=>{x.shadowColor='#ffd766';x.shadowBlur=14;x.font='34px serif';x.fillText('💗',px(u[1]),u[2]*GCELL);x.shadowBlur=0});
    if(L.th==='night'){x.fillStyle='rgba(20,15,60,.28)';x.fillRect(0,0,GW,GH);x.font='30px serif';x.fillText('🌙',GW-30,26)}
    if(L.th==='storm'){x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=1.5;const t=Date.now();for(let i=0;i<28;i++){const a=(i*53+t/5)%GW,b=(i*97+t/2.5)%GH;x.beginPath();x.moveTo(a,b);x.lineTo(a-4,b+12);x.stroke()}}}
};

/* extra trophies for the campaign */
BADGES.push(
  {id:'gd5',e:'🌱',t:'Garden Sprouts',d:'Reach Love Garden level 5',f:()=>gdProg().lv>=5},
  {id:'gd9',e:'🌿',t:'Garden Veterans',d:'Reach level 9',f:()=>gdProg().lv>=9},
  {id:'gd12',e:'🐲',t:'Dragon Slayers',d:'Beat the Grumpy Dragon',f:()=>!!gdProg().stars[NLV]},
  {id:'gd3s',e:'😈',t:'Hard Mode Heroes',d:'Clear any level on Hard',f:()=>Object.values(gdProg().stars).some(v=>v>=3)},
  {id:'gdend',e:'♾️',t:'Endless Love',d:'Survive 10 endless waves',f:()=>gdProg().end>=10});
