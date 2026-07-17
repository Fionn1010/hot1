let savedStop=Number(localStorage.getItem('taraStop')||0);let current=0,userPos=null,heading=0,arrivalAnnounced=false,tourMode='ARRIVED',arWasLaunched=false,arSessionStarted=false;const $=id=>document.getElementById(id),video=$('storyVideo'),model=$('modelViewer');
function hideGate(){const gate=$('gateScreen');gate.classList.add('hide');setTimeout(()=>{gate.style.display='none'},480)}
function showGateOptions(){const t=UI[currentLanguage]||UI.en;const translated=translatedStop(savedStop);if(savedStop>0&&savedStop<STOPS.length){$('resumeTour').style.display='block';$('resumeTour').textContent=`${t.resume}: ${translated.title}`;$('gateActions').classList.add('two')}else{$('resumeTour').style.display='none';$('gateActions').classList.remove('two')}}
function chooseEntrance(){current=0;renderStop();hideGate()}function chooseResume(){current=savedStop;renderStop();hideGate()}
async function chooseNearestStop(){const t=UI[currentLanguage]||UI.en;if(!navigator.geolocation){alert(t.gpsUnavailable);return}$('gateNote').textContent=t.checking;navigator.geolocation.getCurrentPosition(pos=>{userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};let best=0,bestD=Infinity;STOPS.forEach((s,i)=>{const d=distance(userPos.lat,userPos.lng,s.lat,s.lng);if(d<bestD){bestD=d;best=i}});current=best;renderStop();hideGate();$('gpsBtn').textContent=t.gpsActive},err=>{$('gateNote').textContent=t.locationUnavailable},{enableHighAccuracy:true,maximumAge:2000,timeout:10000})}
function videoPath(file){return`videos/${file}`}
function modelPath(file){return`models/${file}`}

const MEDIA_CONFIG_PATH='config/media.json';
const MEDIA_STOP_KEYS=[
 'entrance',
 'banqueting-hall',
 'palisade',
 'rath-of-the-synods',
 'mound-of-the-hostages',
 'stone-of-destiny',
 'teach-cormaic',
 'st-patrick'
];
let MEDIA_CATALOG={stops:{}};

async function loadMediaCatalog(){
 try{
  const response=await fetch(`${MEDIA_CONFIG_PATH}?v=${Date.now()}`,{cache:'no-store'});
  if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  MEDIA_CATALOG=await response.json();
  console.log('Fionn media catalogue loaded:',MEDIA_CONFIG_PATH);
 }catch(error){
  console.error('Could not load Fionn media catalogue. English masters will be used.',error);
  MEDIA_CATALOG={stops:{}};
 }
}

function selectedVideoFile(stop,index){
 const key=MEDIA_STOP_KEYS[index];
 const mediaStop=MEDIA_CATALOG.stops?.[key];
 if(!mediaStop) return stop.video;
 return mediaStop.languages?.[currentLanguage]||mediaStop.default||stop.video;
}

function setVideo(file,fallbackFile=''){
 const status=$('videoStatus');
 status.classList.remove('show');status.textContent='';
 video.pause();video.removeAttribute('src');video.load();
 video.dataset.fallback=fallbackFile||'';
 video.dataset.fallbackUsed='false';
 if(!file){status.textContent='Video coming soon for this stop.';status.classList.add('show');return}
 video.src=videoPath(file);video.load();
}
function setTourMode(mode){
 tourMode=mode;
 const gps=$('gpsSection'),card=document.querySelector('.card'),ar=document.querySelector('.section.ar'),next=$('nextBtn')?.closest('.nextBlock');
 [gps,card,ar,next].forEach(el=>el?.classList.add('flow-hidden'));
 if(mode==='ARRIVED'){card?.classList.remove('flow-hidden')}
 if(mode==='AR_READY'){ar?.classList.remove('flow-hidden')}
 if(mode==='WALKING'){gps?.classList.remove('flow-hidden')}
 if(mode==='FINISHED'){next?.classList.remove('flow-hidden')}
}
function arriveAtCurrentStop(){arrivalAnnounced=true;setTourMode('ARRIVED');window.scrollTo({top:0,behavior:'smooth'});playSoftChime();if(navigator.vibrate)navigator.vibrate([120,80,120])}
function beginWalkingToNext(){
 if(current===STOPS.length-1){showEnd();return}
 current++;renderStop(false,'WALKING');window.scrollTo({top:0,behavior:'smooth'});
}

function renderStop(scroll=true,mode='ARRIVED'){current=Math.max(0,Math.min(current,STOPS.length-1));localStorage.setItem('taraStop',current);const stop=STOPS[current],ts=translatedStop(current),t=UI[currentLanguage]||UI.en;$('stopNum').textContent=currentLanguage==='zh'?`${t.stop}${current+1}站`:`${t.stop} ${current+1}`;$('stopTitle').textContent=ts.title;$('stopSubtitle').textContent=ts.subtitle;$('gpsDest').textContent=ts.title;$('beginBtn').textContent=ts.action||t.beginDefault;$('beginBtn').classList.remove('story-complete');const chosenVideo=selectedVideoFile(stop,current);setVideo(chosenVideo,chosenVideo!==stop.video?stop.video:'');if(stop.model){model.style.display='block';model.src=modelPath(stop.model);$('launchAR').disabled=false;$('launchAR').textContent=t.stepIntoHistory||UI.en.stepIntoHistory}else{model.removeAttribute('src');model.style.display='none';$('launchAR').disabled=true;$('launchAR').textContent=t.arSoon}$('videoBox').classList.add('locked','hidden');$('storyDone').classList.remove('show');if(current===STOPS.length-1){$('nextHeading').textContent=t.finishTour;$('nextName').textContent=t.farewell;$('nextBtn').textContent=t.finishButton;$('nextBtn').className='nextBtn finish'}else{$('nextHeading').textContent=t.nextStop;$('nextName').textContent=translatedStop(current+1).title;$('nextBtn').textContent=t.continue;$('nextBtn').className='nextBtn'}arrivalAnnounced=false;arWasLaunched=false;arSessionStarted=false;$('arContinue').classList.remove('show');setTourMode(mode);updateCompass();updateSceneTestingButtons();if(scroll)window.scrollTo({top:0,behavior:'smooth'})}
