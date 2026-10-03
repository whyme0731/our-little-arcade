/* ==========================================================================
   Our Little Arcade — garden.js
   Love Garden (co-op Plants vs Zombies) + score-race games
   (Flappy Cupid, 2048 Love, Love Snake). Loaded after extras.js.
   ========================================================================== */

/* ============ generic "same seed, compare scores" race games ============ */
function mkRace(id,title,intro,engine){
  const peer={data:null};   // the other player's live state (score, and for Flappy their bird position)
  Net.on(id+'-live',d=>{peer.data=d;const e=$('#rc-ps');if(e&&current===id)e.textContent=d.s});
  Net.on(id+'-start',d=>{if(current===id)Games[id].begin(d.seed)});
  Net.on(id+'-score',d=>{const S=Games[id].s;if(S&&current===id){S.theirs=d.score;if(S.mine!==null)Games[id].result()}});
  Games[id]={title,
    start(el){this.el=el;this.s={mine:null,theirs:null};this.menu()},
    menu(){this.stop();this.el.innerHTML=`<div class="center"><p style="font-size:18px">${intro}</p>
      <p>${Net.connected?`You and ${esc(Net.partner)} get the <b>exact same</b> course. Highest score wins!`:'Connect with your love to race, or practise solo.'}</p>
      <p class="note">Your best: ${LS.get('lg_best_'+id,0)}</p><button class="btn" id="rc-go">▶ Start!</button></div>`;
      $('#rc-go').onclick=()=>{if(!partnerHere(id))return;const seed=Math.floor(Math.random()*1e9);Net.send(id+'-start',{seed});this.begin(seed)}},
    begin(seed){this.stop();this.s={mine:null,theirs:null};peer.data=null;let n=3;
      this.el.innerHTML=`<div class="center" id="rc-c" style="font-size:96px;padding:40px 0">3</div>`;beep(700,.12,'triangle',.15);
      this.cd=setInterval(()=>{if(current!==id){clearInterval(this.cd);return}n--;beep(500+n*120,.12,'triangle',.15);
        if(n>0){$('#rc-c')&&($('#rc-c').textContent=n)}else{clearInterval(this.cd);this.run(seed)}},900)},
    run(seed){this.el.innerHTML=`${Net.connected?`<div class="liveband"><span>You: <b id="rc-ms">0</b></span><span>💜 ${esc(Net.partner)}: <b id="rc-ps">${peer.data?peer.data.s:0}</b></span></div>`:''}<div id="rc-root"></div>`;
      let lastSend=0;const live=p=>{const m=$('#rc-ms');m&&(m.textContent=p.s);const n=performance.now();if(n-lastSend>100||p.final){lastSend=n;Net.send(id+'-live',p)}};
      this.stopFn=engine(seed,$('#rc-root'),score=>{live({s:score,alive:false,final:true});if(current===id)this.finish(score)},live,peer)},
    finish(score){this.stopFn&&this.stopFn();this.stopFn=null;const S=this.s;S.mine=score;Net.send(id+'-score',{score});stat(id);
      const best=LS.get('lg_best_'+id,0);if(score>best)LS.set('lg_best_'+id,score);
      if(!Net.connected||S.theirs!==null)this.result();
      else this.el.innerHTML=`<div class="center"><div class="big-heart">🏁</div><h2>You scored ${score}!</h2><p>Waiting for ${esc(Net.partner)} to finish… 👀</p></div>`},
    result(){const S=this.s;const win=S.mine>S.theirs,tie=S.mine===S.theirs;sfx.win();confetti(80);if(!Net.connected||win||tie)addLove(6);
      this.el.innerHTML=`<div class="center"><div class="big-heart">🏆</div><h2>${!Net.connected?`You scored ${S.mine}!`:win?`🎉 You win! ${S.mine} vs ${S.theirs}`:tie?`Tie! ${S.mine} each 💞`:`${esc(Net.partner)} wins! ${S.theirs} vs ${S.mine} 🥳`}</h2>
        <p class="note">Your best: ${LS.get('lg_best_'+id,0)}</p><button class="btn" id="rc-a">Play again</button></div>`;$('#rc-a').onclick=()=>this.menu()},
    stop(){clearInterval(this.cd);this.stopFn&&this.stopFn();this.stopFn=null}};
}

/* ---- Flappy Cupid ---- */
mkRace('flappy','Flappy Cupid 🕊️','Tap (or press space) to flap. Fly through the gaps — every pipe is +1! You\'ll see your love\'s ghost bird flying the same course.',(seed,root,done,live,peer)=>{
  root.innerHTML='<canvas class="racecv" id="fc" width="320" height="480"></canvas><p class="note center">Tap the screen to flap 🕊️</p>';
  const c=$('#fc'),x=c.getContext('2d'),W=320,H=480,PW=54,GAP=150,SP=130,DIST=185;
  const gapY=k=>110+rng(seed+k*7919)()*(H-110-130-60+60)*.85;
  let by=H/2,vy=0,t=0,score=0,dead=false,raf,last=performance.now(),started=false;
  const bx=80;
  const flap=()=>{if(dead)return;started=true;vy=-390;beep(620,.05,'triangle',.08)};
  c.onpointerdown=e=>{e.preventDefault();flap()};const key=e=>{if(e.code==='Space'){e.preventDefault();flap()}};addEventListener('keydown',key);
  const pipeX=k=>320+k*DIST-t*SP;
  function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;
    if(started&&!dead){t+=dt;vy+=1250*dt;by+=vy*dt;
      // collisions
      if(by>H-24||by<10)dead=true;
      for(let k=0;k<200;k++){const px=pipeX(k);if(px>bx+60)break;if(px+PW<bx-20)continue;const gy=gapY(k);
        if(bx+13>px&&bx-13<px+PW&&(by-13<gy-GAP/2||by+13>gy+GAP/2))dead=true}
      const s=Math.max(0,Math.floor((t*SP-(bx-320)-PW)/DIST)+1);if(s>score){score=s;sfx.pop()}
      live({s:score,t,y:by,alive:!dead});
      if(dead){sfx.bad();setTimeout(()=>done(score),700)}}
    x.clearRect(0,0,W,H);const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#ffd6ea');g.addColorStop(1,'#d9ccff');x.fillStyle=g;x.fillRect(0,0,W,H);
    [[60,90,'☁️'],[230,60,'☁️'],[150,200,'💗']].forEach(([a,b,e])=>drawEm(x,e,(a-t*20%400+400)%400-40,b,34));
    for(let k=0;k<200;k++){const px=pipeX(k);if(px>W+10)break;if(px+PW<-5)continue;const gy=gapY(k);
      x.fillStyle='#ff8fbf';x.beginPath();x.roundRect(px,-10,PW,gy-GAP/2+10,10);x.fill();x.beginPath();x.roundRect(px,gy+GAP/2,PW,H,10);x.fill();
      x.fillStyle='#ffc4de';x.fillRect(px+8,0,8,gy-GAP/2);x.fillRect(px+8,gy+GAP/2,8,H)}
    x.fillStyle='#c9f2c0';x.fillRect(0,H-14,W,14);
    const pd=peer.data;if(pd&&pd.alive&&pd.t!==undefined){const gx=bx+(pd.t-t)*SP;if(gx>-30&&gx<W+30){drawEm(x,'💜',gx,pd.y,34,.45)}}
    x.save();x.translate(bx,by);x.rotate(Math.max(-.5,Math.min(.9,vy/500)));drawEm(x,'🕊️',0,0,34);x.restore();
    x.fillStyle='#4a2c5a';x.font='bold 40px Fredoka, sans-serif';x.textAlign='center';x.fillText(score,W/2,60);
    if(!started){x.font='600 18px Fredoka, sans-serif';x.fillText('TAP to start!',W/2,H/2+60)}
    raf=requestAnimationFrame(loop)}
  raf=requestAnimationFrame(loop);
  return()=>{cancelAnimationFrame(raf);removeEventListener('keydown',key)}});

/* ---- 2048 Love ---- */
mkRace('g2048','2048 Love 🔢','Slide tiles (arrow keys or swipe) and merge equal numbers. You have 90 seconds — score = total of merges!',(seed,root,done,live)=>{
  const R=rng(seed);let b=Array(16).fill(0),score=0,end=false;const T0=Date.now(),LIM=90000;
  const col={0:'#fff',2:'#ffe4f1',4:'#ffd0e6',8:'#ffb3d1',16:'#ff9ec4',32:'#ff86b6',64:'#ff6fa5',128:'#d4c2ff',256:'#b9a2ff',512:'#9b7bff',1024:'#7f5ff0',2048:'#ffd766'};
  root.innerHTML=`<div class="hud"><span id="g-t">⏱ 90</span><span id="g-s">💗 0</span></div><div class="timerbar"><i id="g-b" style="width:100%"></i></div>
    <div id="g-g" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#e6dcff;padding:8px;border-radius:18px;max-width:340px;margin:8px auto;touch-action:none;box-shadow:var(--shadow)"></div>
    <div class="dpad"><span></span><button data-d="u">⬆️</button><span></span><button data-d="l">⬅️</button><button data-d="d">⬇️</button><button data-d="r">➡️</button></div>`;
  const spawn=()=>{const e=b.map((v,i)=>v?-1:i).filter(i=>i>=0);if(!e.length)return;b[e[Math.floor(R()*e.length)]]=R()<.9?2:4};
  const draw=()=>{$('#g-g').innerHTML=b.map(v=>`<div style="aspect-ratio:1;border-radius:12px;background:${col[v]||'#ffd766'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${v>=1024?20:v>=128?26:32}px;color:${v>=8?'#fff':'#4a2c5a'};${v?'animation:pop .2s':''}">${v||''}</div>`).join('');$('#g-s').textContent='💗 '+score;live({s:score,alive:true})};
  const slide=l=>{const a=l.filter(x=>x);let g=0;for(let i=0;i<a.length-1;i++)if(a[i]===a[i+1]){a[i]*=2;g+=a[i];a.splice(i+1,1)}while(a.length<4)a.push(0);return[a,g]};
  const move=d=>{if(end)return;let moved=false,gain=0;const nb=b.slice();
    for(let i=0;i<4;i++){const idx=[0,1,2,3].map(j=>d==='l'?i*4+j:d==='r'?i*4+3-j:d==='u'?j*4+i:(3-j)*4+i);
      const [res,g]=slide(idx.map(k=>b[k]));gain+=g;idx.forEach((k,j)=>{if(nb[k]!==res[j])moved=true;nb[k]=res[j]})}
    if(!moved)return;b=nb;score+=gain;gain?sfx.match():sfx.tap();spawn();draw();
    const can=b.some(v=>!v)||b.some((v,i)=>(i%4<3&&v===b[i+1])||(i<12&&v===b[i+4]));if(!can)finish()};
  const finish=()=>{if(end)return;end=true;clearInterval(iv);setTimeout(()=>done(score),400)};
  const kmap={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'u',ArrowDown:'d',a:'l',d:'r',w:'u',s:'d'};
  const key=e=>{const d=kmap[e.key];if(d){e.preventDefault();move(d)}};addEventListener('keydown',key);
  $$('.dpad button',root).forEach(bt=>bt.onclick=()=>move(bt.dataset.d));
  let sx,sy;const g=$('#g-g');g.onpointerdown=e=>{sx=e.clientX;sy=e.clientY};
  g.onpointerup=e=>{if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))>24)move(Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'d':'u'));sx=null};
  spawn();spawn();draw();
  const iv=setInterval(()=>{const left=LIM-(Date.now()-T0);$('#g-t')&&($('#g-t').textContent='⏱ '+Math.max(0,Math.ceil(left/1000)));$('#g-b')&&($('#g-b').style.width=Math.max(0,left/LIM*100)+'%');if(left<=0)finish()},250);
  return()=>{clearInterval(iv);removeEventListener('keydown',key)}});

/* ---- Love Snake ---- */
mkRace('snake','Love Snake 🐍','Eat the 🍓 to grow. Arrow keys, swipe, or the buttons. Don\'t hit the walls or yourself!',(seed,root,done,live)=>{
  const N=16,CS=20;root.innerHTML=`<div class="hud"><span>🍓 <b id="sn-s">0</b></span></div><canvas class="racecv" id="sn" width="${N*CS}" height="${N*CS}"></canvas>
    <div class="dpad"><span></span><button data-d="u">⬆️</button><span></span><button data-d="l">⬅️</button><button data-d="d">⬇️</button><button data-d="r">➡️</button></div>`;
  const c=$('#sn'),x=c.getContext('2d');let snake=[[5,8],[4,8],[3,8]],dir=[1,0],q=[],eaten=0,dead=false,tick;
  const food=()=>{for(let t=0;t<400;t++){const r=rng(seed+eaten*131+t*17)(),i=Math.floor(r*N*N),p=[i%N,Math.floor(i/N)];if(!snake.some(s=>s[0]===p[0]&&s[1]===p[1]))return p}return[0,0]};
  let f=food();
  const D={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]};
  const turn=k=>{const d=D[k],ref=q.length?q[q.length-1]:dir;if(d[0]===-ref[0]&&d[1]===-ref[1])return;if(d[0]===ref[0]&&d[1]===ref[1])return;if(q.length<3)q.push(d)};
  const kmap={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'u',ArrowDown:'d',a:'l',d:'r',w:'u',s:'d'};
  const key=e=>{const k=kmap[e.key];if(k){e.preventDefault();turn(k)}};addEventListener('keydown',key);
  $$('.dpad button',root).forEach(b=>b.onclick=()=>turn(b.dataset.d));
  let sx,sy;c.onpointerdown=e=>{sx=e.clientX;sy=e.clientY};c.onpointerup=e=>{if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))>20)turn(Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'d':'u'));sx=null};
  const draw=()=>{x.fillStyle='#fff0f7';x.fillRect(0,0,N*CS,N*CS);for(let i=0;i<N;i++)for(let j=0;j<N;j++)if((i+j)%2){x.fillStyle='#ffe4f1';x.fillRect(i*CS,j*CS,CS,CS)}
    drawEm(x,'🍓',f[0]*CS+CS/2,f[1]*CS+CS/2+1,18);
    snake.forEach((s,i)=>{x.fillStyle=i===0?'#ff6fa5':i%2?'#ff9ec4':'#ffb3d1';x.beginPath();x.roundRect(s[0]*CS+1,s[1]*CS+1,CS-2,CS-2,i===0?8:6);x.fill()});
    const h=snake[0];x.fillStyle='#fff';x.fillRect(h[0]*CS+5,h[1]*CS+6,3,3);x.fillRect(h[0]*CS+12,h[1]*CS+6,3,3)};
  const step=()=>{if(dead)return;if(q.length)dir=q.shift();const h=[snake[0][0]+dir[0],snake[0][1]+dir[1]];
    if(h[0]<0||h[1]<0||h[0]>=N||h[1]>=N||snake.some(s=>s[0]===h[0]&&s[1]===h[1])){dead=true;sfx.bad();clearInterval(tick);setTimeout(()=>done(eaten),500);return}
    snake.unshift(h);if(h[0]===f[0]&&h[1]===f[1]){eaten++;sfx.match();$('#sn-s').textContent=eaten;live({s:eaten,alive:true});f=food()}else snake.pop();draw();
    clearInterval(tick);tick=setInterval(step,Math.max(70,140-eaten*3))};
  draw();tick=setInterval(step,140);
  return()=>{clearInterval(tick);removeEventListener('keydown',key)}});

