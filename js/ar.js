async function ensureCurrentModel(){
  const stop=STOPS[current];
  if(!stop.model) throw new Error('No AR model is configured for this stop.');

  const standard=modelPath(stop.model);
  const tier=window.FionnEngine?.quality?.selected||'standard';
  const wanted=window.FionnEngine?.resolveTieredAsset
    ? await window.FionnEngine.resolveTieredAsset(standard,tier)
    : standard;

  model.style.display='block';
  model.dataset.qualityTier=tier;

  if(model.getAttribute('src')!==wanted) model.setAttribute('src',wanted);

  await customElements.whenDefined('model-viewer');
  if(model.updateComplete) await model.updateComplete;
  if(model.loaded) return;

  await new Promise((resolve,reject)=>{
    const timeout=tier==='enhanced'?45000:tier==='lite'?22000:32000;
    const timer=setTimeout(
      ()=>reject(new Error('The AR model took too long to load.\nTry Lite quality from the bottom toolbar.')),
      timeout
    );

    const cleanup=()=>{
      model.removeEventListener('load',done);
      model.removeEventListener('error',fail);
    };
    const done=()=>{clearTimeout(timer);cleanup();resolve();};
    const fail=()=>{clearTimeout(timer);cleanup();reject(new Error('The AR model could not be loaded.\nTry Lite quality.'));};

    model.addEventListener('load',done,{once:true});
    model.addEventListener('error',fail,{once:true});
  });
}

function restorePageAfterAR(){
  /*
   * Native Quick Look / Scene Viewer may leave Safari or Chrome with stale
   * scroll-lock styles after returning to the webpage. Explicitly restore
   * normal document scrolling and remove any temporary AR-related locks.
   */
  const html=document.documentElement;
  const body=document.body;

  [html,body].forEach(el=>{
    if(!el) return;
    el.style.removeProperty('overflow');
    el.style.removeProperty('position');
    el.style.removeProperty('height');
    el.style.removeProperty('width');
    el.style.removeProperty('top');
    el.style.removeProperty('touch-action');
    el.classList.remove('ar-active','no-scroll','scroll-locked','modal-open');
  });

  document.querySelectorAll('.fionn-modal.show').forEach(el=>el.classList.remove('show'));
  $('postArOverlay')?.classList.remove('show');

  // Safari occasionally needs a layout refresh after Quick Look closes.
  void body?.offsetHeight;
  window.scrollBy(0,1);
  window.scrollBy(0,-1);
}

async function launchCurrentAR(){
  $('cinemaOverlay').classList.remove('show');
  setTourMode('AR_READY');
  arWasLaunched=true;
  arSessionStarted=false;
  $('arContinue').classList.add('show');

  const button=$('launchAR');
  const original=button.textContent;
  button.disabled=true;
  button.textContent='LOADING AR…';

  try{
    await ensureCurrentModel();
    button.textContent=original;
    button.disabled=false;

    if(typeof model.activateAR!=='function'){
      throw new Error('AR is not supported by this browser.');
    }

    await model.activateAR();
  }catch(error){
    console.error('AR launch failed:',error);
    button.textContent=original;
    button.disabled=false;
    arWasLaunched=false;
    restorePageAfterAR();
    alert(error.message||'The AR scene could not be opened.\nPlease reload the page and try again.');
  }
}

function showPostAr(){
  if(!arWasLaunched) return;

  arWasLaunched=false;
  restorePageAfterAR();

  /*
   * Do not open a full-screen post-AR overlay. That overlay prevented normal
   * page scrolling on some mobile browsers after returning from native AR.
   * Keep the visitor in the AR section and expose the normal Continue button.
   */
  setTourMode('AR_READY');
  $('arContinue').classList.add('show');

  const arSection=document.querySelector('.section.ar');
  if(arSection){
    setTimeout(()=>{
      restorePageAfterAR();
      arSection.scrollIntoView({behavior:'smooth',block:'start'});
    },120);
  }

  playSoftChime();
}

let pageWasHiddenForAR=false;

document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&arWasLaunched){
    pageWasHiddenForAR=true;
  }

  if(!document.hidden&&arWasLaunched&&pageWasHiddenForAR){
    pageWasHiddenForAR=false;
    setTimeout(showPostAr,450);
  }
});

window.addEventListener('pageshow',()=>{
  restorePageAfterAR();

  if(arWasLaunched&&pageWasHiddenForAR){
    pageWasHiddenForAR=false;
    setTimeout(showPostAr,450);
  }
});

window.addEventListener('focus',()=>{
  if(arWasLaunched&&pageWasHiddenForAR){
    pageWasHiddenForAR=false;
    setTimeout(showPostAr,450);
  }else{
    restorePageAfterAR();
  }
});
