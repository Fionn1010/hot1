async function openStoryCinema(){
 const status=$('videoStatus');
 status.classList.remove('show');
 $('videoBox').classList.remove('hidden');
 $('videoBox').classList.remove('locked');
 if(!video.src){completeStory();return}
 video.currentTime=0;
 video.setAttribute('controls','controls');
 try{
  // Start playback directly from the Explorer's tap. This preserves the
  // mobile browser user gesture for dubbed videos that contain audio.
  await video.play();
  status.classList.remove('show');
  FIONN_PRELOAD.start();
  try{
   if(video.webkitEnterFullscreen&&/iPad|iPhone|iPod/.test(navigator.userAgent)){
    video.webkitEnterFullscreen();
   }else if(video.requestFullscreen){
    await video.requestFullscreen();
   }
  }catch(fullscreenError){
   console.warn('Fullscreen was not available; continuing inline.',fullscreenError);
  }
 }catch(playError){
  console.error('Story playback failed:',playError);
  const fallbackMessages={
   fr:"Touchez le bouton de lecture de la vidéo pour commencer.",
   de:"Tippen Sie auf die Wiedergabetaste des Videos, um zu beginnen.",
   es:"Toca el botón de reproducción del vídeo para comenzar.",
   it:"Tocca il pulsante di riproduzione del video per iniziare.",
   pt:"Toque no botão de reprodução do vídeo para começar.",
   hi:"वीडियो शुरू करने के लिए प्ले बटन दबाएँ।",
   zh:"点击视频播放按钮开始。",
   th:"แตะปุ่มเล่นวิดีโอเพื่อเริ่ม"
  };
  status.textContent=fallbackMessages[currentLanguage]||'Tap the video play button to begin.';
  status.classList.add('show');
 }
}
function closeStoryCinema(){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});try{if(video.webkitExitFullscreen)video.webkitExitFullscreen()}catch(e){}video.pause();video.currentTime=0;video.removeAttribute('controls');$('videoBox').classList.add('locked','hidden')}
function playSoftChime(){try{const AudioCtx=window.AudioContext||window.webkitAudioContext,ctx=new AudioCtx();[523.25,659.25,783.99].forEach((freq,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,ctx.currentTime+i*.12);gain.gain.linearRampToValueAtTime(.055,ctx.currentTime+i*.12+.025);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.12+.55);osc.connect(gain);gain.connect(ctx.destination);osc.start(ctx.currentTime+i*.12);osc.stop(ctx.currentTime+i*.12+.6)})}catch(e){}}
function showCinemaTransition(){const t=UI[currentLanguage]||UI.en;$('cinemaTitle').textContent=t.storyTold||'The story has been told.';$('cinemaText').textContent=t.enterHighKingWorld||'Now step into the world of the High King.';$('transitionAR').textContent=t.stepIntoHistory||'STEP INTO HISTORY';$('cinemaOverlay').classList.add('show');playSoftChime()}
let storyCompletionHandled=false;
function completeStory(){
 if(storyCompletionHandled)return;
 storyCompletionHandled=true;
 closeStoryCinema();
 $('storyDone').classList.add('show');
 $('beginBtn').textContent=(UI[currentLanguage]||UI.en).storyComplete;
 $('beginBtn').classList.add('story-complete');
 showCinemaTransition();
}
function finishStoryPlayback(){
 video.pause();
 try{if(video.webkitDisplayingFullscreen&&video.webkitExitFullscreen)video.webkitExitFullscreen()}catch(e){}
 if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
 setTimeout(completeStory,180);
}
$('startEntrance').addEventListener('click',chooseEntrance);$('resumeTour').addEventListener('click',chooseResume);$('jumpNearest').addEventListener('click',chooseNearestStop);$('beginBtn').addEventListener('click',()=>{storyCompletionHandled=false;openStoryCinema()});video.addEventListener('ended',finishStoryPlayback);video.addEventListener('webkitendfullscreen',()=>{if(video.ended)completeStory()});video.addEventListener('error',()=>{
 const fallback=video.dataset.fallback;
 if(fallback && video.dataset.fallbackUsed!=='true'){
  video.dataset.fallbackUsed='true';
  video.src=videoPath(fallback);
  video.load();
  return;
 }
 $('videoStatus').textContent='This video file was not found. Check the filename in /videos is exactly correct.';
 $('videoStatus').classList.add('show');
});$('stopAll').addEventListener('click',()=>{closeStoryCinema()});$('nextBtn').addEventListener('click',beginWalkingToNext);$('jumpCurrent').addEventListener('click',()=>{if(!userPos){alert((UI[currentLanguage]||UI.en).enableFirst);return}let best=0,bestD=Infinity;STOPS.forEach((s,i)=>{const d=distance(userPos.lat,userPos.lng,s.lat,s.lng);if(d<bestD){bestD=d;best=i}});current=best;renderStop()});$('launchAR').addEventListener('click',launchCurrentAR);$('transitionAR').addEventListener('click',launchCurrentAR);$('arContinue').addEventListener('click',showPostAr);$('continueAfterAR').addEventListener('click',()=>{$('postArOverlay').classList.remove('show');beginWalkingToNext()});$('arrivedBtn').addEventListener('click',arriveAtCurrentStop);model.addEventListener('ar-status',event=>{if(event.detail.status==='session-started')arSessionStarted=true;if(event.detail.status==='not-presenting'&&arSessionStarted)showPostAr()});$('returnStart').addEventListener('click',()=>{current=0;localStorage.setItem('taraStop',0);$('endScreen').classList.remove('show');$('farewellVideo').pause();$('farewellVideo').currentTime=0;renderStop()});$('thankImg').addEventListener('error',()=>{$('thankImg').style.display='none';$('thanksFallback').style.display='block'});$('farewellVideo').addEventListener('ended',()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('farewellVideo').style.display='none';$('thankImg').style.display='block'});$('farewellVideo').addEventListener('error',()=>{$('farewellVideo').style.display='none';$('thankImg').style.display='block'});

async function showEnd(){$('endScreen').classList.add('show');$('farewellVideo').style.display='block';$('thankImg').style.display='none';const fv=$('farewellVideo');fv.currentTime=0;try{if(fv.webkitEnterFullscreen&&/iPad|iPhone|iPod/.test(navigator.userAgent))fv.webkitEnterFullscreen();else if(fv.requestFullscreen)await fv.requestFullscreen()}catch(e){}setTimeout(()=>fv.play().catch(()=>{}),180)}
