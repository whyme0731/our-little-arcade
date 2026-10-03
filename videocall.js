/* ==========================================================================
   Our Little Arcade — videocall.js
   Face-to-face video calling built on the same peer-to-peer connection.
   The call lives in a bar docked at the very top of the screen that PUSHES the
   page down (it never floats over the games), so you can see each other while
   you play. Needs the https:// link (or localhost) for camera access.
   ========================================================================== */
const VC={local:null,remote:null,call:null,state:'idle',size:LS.get('lg_vcsize',1),min:false,mic:true,cam:true,rmic:true,rcam:true,ringT:null,ringIv:null,peerId:null};
const VC_SIZES=['S','M','L'];

/* ---------- build the UI ---------- */
(function build(){
  const bar=document.createElement('div');bar.id='callbar';bar.className='hidden';
  bar.innerHTML=`<div class="cb-tiles">
      <div class="cb-tile cb-remote"><video id="vc-r" autoplay playsinline></video><div class="cb-wait" id="vc-wait">📞<br><small>Calling…</small></div><span class="cb-name" id="vc-name"></span><span class="cb-badge" id="vc-rb"></span></div>
      <div class="cb-tile cb-local"><video id="vc-l" autoplay playsinline muted></video><span class="cb-badge" id="vc-lb"></span></div>
    </div>
    <div class="cb-ctl"><button id="vc-mic" title="Mute / unmute">🎤</button><button id="vc-cam" title="Camera on / off">📷</button><button id="vc-size" title="Change video size">↕️ M</button><button id="vc-min" title="Shrink the call bar">▴</button><button id="vc-end" class="end" title="Hang up">📵</button></div>`;
  document.body.appendChild(bar);
  const ring=document.createElement('div');ring.id='callring';ring.className='hidden';
  ring.innerHTML=`<div class="cr-card"><div class="cr-emoji">📹</div><b id="cr-t">Calling…</b><div class="row" style="justify-content:center;margin-top:8px"><button class="btn mint small" id="cr-yes">Answer 💚</button><button class="btn ghost small" id="cr-no">Decline</button></div></div>`;
  document.body.appendChild(ring);
  const hb=$('#themeBtn');const btn=document.createElement('button');btn.className='iconbtn';btn.id='callBtn';btn.title='Video call';btn.textContent='📹';hb.parentNode.insertBefore(btn,hb);
  btn.onclick=()=>VC.state==='idle'?startCall():toast('You\'re already in a call — use 📵 to hang up');
  $('#vc-mic').onclick=()=>toggle('mic');$('#vc-cam').onclick=()=>toggle('cam');
  $('#vc-size').onclick=()=>{VC.size=(VC.size+1)%3;LS.set('lg_vcsize',VC.size);layout()};
  $('#vc-min').onclick=()=>{VC.min=!VC.min;layout()};
  $('#vc-end').onclick=()=>endCall(false);
  $('#cr-yes').onclick=acceptCall;
  $('#cr-no').onclick=()=>{if(VC.state==='calling')endCall(false);else{Net.send('vc-no');closeRing();VC.state='idle'}};
  if(window.ResizeObserver)new ResizeObserver(()=>setPad()).observe(bar);
})();

function setPad(){const b=$('#callbar');const h=b.classList.contains('hidden')?0:Math.ceil(b.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--callh',h+'px');document.body.classList.toggle('incall',h>0)}
function layout(){const b=$('#callbar');b.classList.toggle('min',VC.min);b.dataset.size=VC.size;$('#vc-size').textContent='↕️ '+VC_SIZES[VC.size];$('#vc-min').textContent=VC.min?'▾':'▴';setTimeout(setPad,30)}
function showBar(){$('#callbar').classList.remove('hidden');layout();setPad()}
function hideBar(){$('#callbar').classList.add('hidden');setPad()}

/* ---------- media ---------- */
/* small, light video: it's shown in a little tile, and a phone encoding a big picture while also running the games is what makes everything stutter */
const VIDEO_C={facingMode:'user',width:{ideal:320},height:{ideal:240},frameRate:{ideal:15,max:24}};
async function getLocal(){if(VC.local)return VC.local;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('📹 Video calls need the secure https:// link (your hosted site) — not a local file');throw new Error('nomedia')}
  try{VC.local=await navigator.mediaDevices.getUserMedia({video:VIDEO_C,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
  catch(e){dlog('camera error: '+e.name);
    if(e.name==='NotAllowedError'||e.name==='SecurityError'){toast('🔒 Camera/mic is blocked. Tap the lock or camera icon next to the web address, allow Camera and Microphone, then try again.');throw e}
    try{VC.local=await navigator.mediaDevices.getUserMedia({audio:true});VC.cam=false;toast(e.name==='NotReadableError'?'📷 Another app is using your camera — close it and call again. Voice only for now 🎤':'No camera found — voice only 🎤')}
    catch(e2){dlog('mic error: '+e2.name);toast('Couldn\'t use the microphone either — check the permission in your browser 🔒');throw e2}}
  VC.mic=true;VC.cam=VC.local.getVideoTracks().length>0;$('#vc-l').srcObject=VC.local;return VC.local}
function releaseLocal(){if(VC.local){VC.local.getTracks().forEach(t=>t.stop());VC.local=null}$('#vc-l').srcObject=null}
function toggle(w){if(!VC.local)return;if(w==='mic'){VC.mic=!VC.mic;VC.local.getAudioTracks().forEach(t=>t.enabled=VC.mic)}else{VC.cam=!VC.cam;VC.local.getVideoTracks().forEach(t=>t.enabled=VC.cam)}
  Net.send('vc-state',{mic:VC.mic,cam:VC.cam});uiState()}
function uiState(){$('#vc-mic').classList.toggle('off',!VC.mic);$('#vc-mic').textContent=VC.mic?'🎤':'🔇';$('#vc-cam').classList.toggle('off',!VC.cam);$('#vc-cam').textContent=VC.cam?'📷':'🚫';
  $('#vc-lb').textContent=(VC.mic?'':'🔇 ')+(VC.cam?'':'📷off');$('#vc-rb').textContent=(VC.rmic?'':'🔇 ')+(VC.rcam?'':'📷off');
  $('#vc-l').style.opacity=VC.cam?1:.15;$('#vc-r').style.opacity=VC.rcam?1:.15}

/* ---------- ringing ---------- */
function ringUI(text,showBtns){$('#cr-t').textContent=text;$('#callring').classList.remove('hidden');$('#cr-yes').style.display=showBtns?'':'none';$('#cr-no').style.display=showBtns?'':'none'}
function closeRing(){$('#callring').classList.add('hidden');clearInterval(VC.ringIv);clearTimeout(VC.ringT)}
function startRinging(){clearInterval(VC.ringIv);let n=0;VC.ringIv=setInterval(()=>{beep(880,.15,'sine',.15);beep(1100,.2,'sine',.15,.2);vibe([200,100,200]);if(++n>14)clearInterval(VC.ringIv)},2000);beep(880,.15,'sine',.15);beep(1100,.2,'sine',.15,.2)}

/* ---------- call flow ----------
   1. caller: camera on, sends 'vc-ring'
   2. callee: taps Answer, camera on, places the media call to the caller
   3. caller: auto-answers with their stream  → both see each other            */
async function startCall(){if(!Net.connected){toast('Connect with your love first, then tap 📹 💞');return}if(VC.state!=='idle')return;
  Net.ensureTurn();      // start fetching the relay credentials now, while the camera starts
  try{await getLocal()}catch{return}
  VC.state='calling';VC.peerId=Net.conn&&Net.conn.peer;$('#vc-wait').style.display='';$('#vc-name').textContent=Net.partner;showBar();uiState();
  Net.send('vc-ring',{name:me.name});ringUI(`Calling ${Net.partner}… 📞`,false);$('#cr-no').style.display='';$('#cr-no').textContent='Cancel';
  clearTimeout(VC.ringT);VC.ringT=setTimeout(()=>{if(VC.state==='calling'){toast(`${Net.partner} didn't pick up 😢`);endCall(false)}},45000)}
async function acceptCall(){closeRing();try{await getLocal()}catch{Net.send('vc-no');VC.state='idle';return}
  VC.state='connecting';VC.peerId=Net.conn&&Net.conn.peer;$('#vc-wait').style.display='';$('#vc-name').textContent=Net.partner;showBar();uiState();
  Net.send('vc-ok');
  if(!Net.hasTurn&&CFG.relay){toast('⏳ Getting the video helper ready…');await Net.ensureTurn(40000);if(VC.state!=='connecting')return}   // the relay is what makes video work between two Wi-Fi networks
  useIce();const call=Net.peer.call(VC.peerId,VC.local);wire(call)}
/* give the media connection the freshest STUN/TURN list (TURN = relay for strict networks) */
function useIce(){try{Net.peer.options.config=Object.assign({},Net.peer.options.config||{},{iceServers:Net.ice})}catch{}}
function netHelp(){return Net.hasTurn?'The video still couldn\'t connect. Try switching one of you to mobile data. 📶':'Your networks are blocking direct video. Try mobile data on one side — or set up the relay service so this works everywhere (see README). 📶'}
function wire(call){VC.call=call;clearTimeout(VC.connT);VC.connT=setTimeout(()=>{if(VC.call===call&&VC.state!=='live'){dlog('video did not connect');toast('📹 '+netHelp());endCall(false)}},40000);
  setTimeout(()=>{try{const pc=call.peerConnection;if(pc)pc.addEventListener('iceconnectionstatechange',()=>{if(VC.call===call&&pc.iceConnectionState==='failed'){toast('📹 '+netHelp());endCall(false)}})}catch{}},400);
  call.on('stream',rs=>{clearTimeout(VC.connT);VC.remote=rs;const v=$('#vc-r');v.srcObject=rs;const pr=v.play&&v.play();if(pr&&pr.catch)pr.catch(()=>{v.muted=true;v.play().catch(()=>{});toast('🔈 Tap their video to turn the sound on');v.onclick=()=>{v.muted=false;v.play().catch(()=>{});v.onclick=null}});capVideo(call);$('#vc-wait').style.display='none';VC.state='live';closeRing();$('#cr-no').textContent='Decline';
    showBar();uiState();Net.send('vc-state',{mic:VC.mic,cam:VC.cam});sfx.love();toast(`📹 You can see ${Net.partner}! 💞`)});
  /* a late 'close' from an OLD call must never end a newer one */
  call.on('close',()=>{if(VC.call===call)endCall(true)});call.on('error',()=>{if(VC.call===call)endCall(true)})}
function endCall(remote){const was=VC.state!=='idle';clearTimeout(VC.ringT);clearTimeout(VC.connT);closeRing();
  try{VC.call&&VC.call.close()}catch{}VC.call=null;VC.remote=null;$('#vc-r').srcObject=null;releaseLocal();
  VC.state='idle';VC.rmic=VC.rcam=true;$('#cr-no').textContent='Decline';hideBar();if(was&&!remote)Net.send('vc-end');if(was&&remote)toast('📵 Call ended')}

/* ---------- messages ---------- */
Net.on('vc-ring',d=>{
  if(VC.state==='calling'){acceptCall();return}     // both pressed call at once → connect
  if(VC.state!=='idle'){return}
  VC.state='ringing';ringUI(`${esc(d&&d.name||Net.partner)} is video calling you 📹`,true);startRinging();
  clearTimeout(VC.ringT);VC.ringT=setTimeout(()=>{if(VC.state==='ringing'){closeRing();VC.state='idle'}},45000)});
Net.on('vc-no',()=>{if(VC.state==='calling'){toast(`${Net.partner} can't talk right now 💔`);endCall(true)}});
Net.on('vc-ok',()=>{});
Net.on('vc-end',()=>{if(VC.state==='ringing'){closeRing();VC.state='idle';toast('Missed video call 📹')}else if(VC.state!=='idle')endCall(true)});
Net.on('vc-state',d=>{VC.rmic=!!(d&&d.mic);VC.rcam=!!(d&&d.cam);uiState()});

/* the caller answers the incoming media call with their own stream */
function attachCallHandler(){const p=Net.peer;if(!p||p._vcAttached)return;p._vcAttached=true;
  p.on('call',call=>{if((VC.state==='calling'||VC.state==='connecting')&&VC.local){useIce();call.answer(VC.local);wire(call)}else{try{call.close()}catch{}}})}
{const _oc6=onConnected;onConnected=function(){_oc6();attachCallHandler()}}
/* (a brief drop of the game link no longer hangs up the call — the video travels on its own connection) */
addEventListener('beforeunload',()=>{if(VC.state!=='idle')try{Net.send('vc-end')}catch{}});

/* cap the video's bitrate so it can't flood a phone's connection or CPU */
function capVideo(call){try{const pc=call.peerConnection;pc&&pc.getSenders().forEach(sd=>{if(sd.track&&sd.track.kind==='video'){const p=sd.getParameters();p.encodings=p.encodings&&p.encodings.length?p.encodings:[{}];p.encodings[0].maxBitrate=280000;p.encodings[0].maxFramerate=20;sd.setParameters(p).catch(()=>{})}})}catch{}}
/* if the phone paused the camera while the page was in the background, switch it back on */
async function fixCamera(){if(VC.state==='idle'||!VC.local)return;const vt=VC.local.getVideoTracks()[0];if(!vt||vt.readyState==='live')return;
  try{const st=await navigator.mediaDevices.getUserMedia({video:VIDEO_C}),nt=st.getVideoTracks()[0];VC.local.removeTrack(vt);VC.local.addTrack(nt);
    const pc=VC.call&&VC.call.peerConnection,sd=pc&&pc.getSenders().find(x=>x.track&&x.track.kind==='video');if(sd)await sd.replaceTrack(nt);
    $('#vc-l').srcObject=VC.local;VC.cam=true;Net.send('vc-state',{mic:VC.mic,cam:VC.cam});uiState();dlog('camera restarted');toast('📷 Camera is back')}catch(e){dlog('camera restart failed: '+e.name)}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(fixCamera,600)});
