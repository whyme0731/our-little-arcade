/* ==========================================================================
   Our Little Arcade — perf.js
   • Smoother ("Lite") mode: switches itself on if the phone can't keep up
   • Connection panel: tap the "Playing with…" pill — shows what's going on,
     and can TEST whether video will work through your network
   • Puts you straight back into your room after a reload / phone sleep
   ========================================================================== */

/* ---------- Smoother mode ---------- */
const LITE_LABEL={auto:['⚡','Smoother mode: Auto — turns itself on if the game stutters'],on:['🪶','Smoother mode: ON (fewer decorations)'],off:['✨','Smoother mode: OFF (all the sparkle)']};
let _autoLite=!!LS.get('lg_autolite',false);
function liteMode(){return LS.get('lg_lite','auto')}
function applyLite(){const m=liteMode(),on=m==='on'||(m==='auto'&&_autoLite);document.body.classList.toggle('lite',on);
  const b=$('#liteBtn');if(b){b.textContent=LITE_LABEL[m][0];b.title=LITE_LABEL[m][1]}}
$('#liteBtn').onclick=()=>{const order=['auto','on','off'],m=order[(order.indexOf(liteMode())+1)%3];LS.set('lg_lite',m);if(m==='auto')_autoLite=!!LS.get('lg_autolite',false);applyLite();toast(LITE_LABEL[m][1]);sfx.pop()};
applyLite();
/* frame-rate watcher */
let _fps=60;
(()=>{let last=performance.now(),acc=0,n=0,slow=0,t0=last;
  const tick=now=>{const d=now-last;last=now;
    if(document.visibilityState==='visible'&&d<1000){acc+=d;n++}
    if(now-t0>=3000){if(n>20){_fps=1000/(acc/n);
        if(liteMode()==='auto'&&!_autoLite){slow=_fps<34?slow+1:0;if(slow>=2){_autoLite=true;LS.set('lg_autolite',true);applyLite();dlog('auto Smoother mode ON (fps '+_fps.toFixed(0)+')');toast('⚡ Smoother mode turned on to keep things fast. Tap ⚡ to change.')}}}
      acc=0;n=0;t0=now}
    requestAnimationFrame(tick)};requestAnimationFrame(tick)})();

/* ---------- connection panel ---------- */
async function testRelay(out){out.textContent='Checking… (this can take up to a minute the first time while the relay wakes up)';
  const t0=performance.now();const ok=await Net.ensureTurn(60000);
  if(!ok){out.textContent=CFG.relay?'❌ Could not get relay credentials from '+CFG.relay+'. Check it is running (open https://'+CFG.relay+'/turn).':'ℹ️ No relay is configured in config.js.';return}
  const got={};try{const pc=new RTCPeerConnection({iceServers:Net.ice,iceTransportPolicy:'relay'});pc.createDataChannel('x');
    pc.onicecandidate=e=>{if(e.candidate&&e.candidate.type==='relay'){const k=(e.candidate.relayProtocol||e.candidate.protocol||'?');got[k]=(got[k]||0)+1}};
    await pc.setLocalDescription(await pc.createOffer());await new Promise(r=>{const t=setTimeout(r,9000);pc.onicegatheringstatechange=()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);r()}}});pc.close()}catch(e){}
  const k=Object.keys(got);out.textContent=k.length?'✅ Video relay works on this network ('+k.join(', ')+') — calls will connect even on strict Wi-Fi. ('+((performance.now()-t0)/1000).toFixed(1)+'s)':'⚠️ Credentials loaded, but this network blocked every relay port. Try a different Wi-Fi once, and tell me what you see.'}
function openDiag(){const old=$('#diagov');if(old)old.remove();const ov=document.createElement('div');ov.id='diagov';
  const pc=Net.conn&&Net.conn.peerConnection,loads=DLOG.a.filter(l=>l.includes('PAGE LOADED')).length;
  const rows=[['Status',Net.connected?'Connected 🔒':(Net.sess()?'Reconnecting…':'Not connected')],['Role / room',(Net.role||'-')+' / '+(Net.code||'-')],['Partner',Net.connected?Net.partner:'-'],
    ['Link',pc?pc.iceConnectionState:'-'],['Relay (TURN) ready',Net.hasTurn?'yes ✅':(CFG.relay?'not yet ⏳':'no relay set')],['Speed (fps)',_fps.toFixed(0)+' · mode '+liteMode()+(document.body.classList.contains('lite')?' (Smoother ON)':'')],
    ['Page loads logged',loads+(loads>2?' ⚠️ page keeps reloading':'')]];
  ov.innerHTML=`<div class="card"><h3>🔧 Connection &amp; speed</h3><div class="kv">${rows.map(r=>`<b>${esc(r[0])}</b><span>${esc(r[1])}</span>`).join('')}</div>
    <div class="row" style="margin:10px 0"><button class="btn small mint" id="dg-test">🧪 Test video on this network</button><button class="btn small" id="dg-retry">Retry now</button></div>
    <div id="dg-out" class="note" style="min-height:20px"></div>
    <pre id="dg-log">${esc(DLOG.a.slice(-40).join('\n'))}</pre>
    <div class="row" style="justify-content:space-between"><button class="btn small ghost" id="dg-copy">📋 Copy log</button><button class="btn small ghost" id="dg-leave">Leave room</button><button class="btn small" id="dg-x">Close</button></div></div>`;
  document.body.appendChild(ov);const close=()=>ov.remove();
  ov.onclick=e=>{if(e.target===ov)close()};$('#dg-x').onclick=close;
  $('#dg-test').onclick=()=>testRelay($('#dg-out'));$('#dg-retry').onclick=()=>{Net.kick();toast('Trying again… 💫');close()};
  $('#dg-leave').onclick=()=>{close();leaveRoomUI()};
  $('#dg-copy').onclick=async()=>{const txt=rows.map(r=>r.join(': ')).join('\n')+'\n\n'+DLOG.a.join('\n');try{await navigator.clipboard.writeText(txt);toast('Copied 📋')}catch{const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('Copied 📋')}catch{}ta.remove()}}}
document.querySelector('.pill').onclick=openDiag;document.querySelector('.pill').style.cursor='pointer';document.querySelector('.pill').title='Connection details';

/* ---------- back into the room after a reload ---------- */
try{if(me.name&&Net.resume()){showHub();setStatus();toast('🔄 Getting you back into your room…')}}catch(e){console.error(e)}
