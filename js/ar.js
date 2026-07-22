async function ensureCurrentModel(){
  const stop=STOPS[current];
  if(!stop.model) throw new Error('No AR model is configured for this stop.');
  const standard=modelPath(stop.model);
  const tier=window.FionnEngine?.quality?.selected||'standard';
  const wanted=window.FionnEngine?.resolveTieredAsset?await window.FionnEngine.resolveTieredAsset(standard,tier):standard;
  model.style.display='block';
  model.dataset.qualityTier=tier;
  if(model.getAttribute('src')!==wanted) model.setAttribute('src',wanted);
  await customElements.whenDefined('model-viewer');
  if(model.updateComplete) await model.updateComplete;
  if(model.loaded) return;
  await new Promise((resolve,reject)=>{
    const timeout=tier==='enhanced'?45000:tier==='lite'?22000:32000;
    const timer=setTimeout(()=>reject(new Error('The AR model took too long to load. Try Lite quality from the bottom toolbar.')),timeout);
    const done=()=>{clearTimeout(timer);cleanup();resolve();};
    const fail=()=>{clearTimeout(timer);cleanup();reject(new Error('The AR model could not be loaded. Try Lite quality.'));};
    const cleanup=()=>{model.removeEventListener('load',done);model.removeEventListener('error',fail);};
    model.addEventListener('load',done,{once:true});model.addEventListener('error',fail,{once:true});
  });
}
async function launchCurrentAR(){
  $('cinemaOverlay').classList.remove('show');setTourMode('AR_READY');arWasLaunched=true;arSessionStarted=false;$('arContinue').classList.add('show');
  const button=$('launchAR'),original=button.textContent;button.disabled=true;button.textContent='LOADING AR…';
  try{await ensureCurrentModel();button.textContent=original;button.disabled=false;if(typeof model.activateAR!=='function')throw new Error('AR is not supported by this browser.');await model.activateAR();}
  catch(error){console.error('AR launch failed:',error);button.textContent=original;button.disabled=false;arWasLaunched=false;alert(error.message||'The AR scene could not be opened. Please reload the page and try again.');}
}
function showPostAr(){if(!arWasLaunched)return;const t=UI[currentLanguage]||UI.en;arWasLaunched=false;$('postArTitle').textContent=t.excellent||'Excellent.';$('postArText').innerHTML=`${t.stoodWhereKing||'You have stood where the High King once stood.'}<br>${t.pathContinues}`;$('continueAfterAR').textContent=t.continue||'CONTINUE';$('postArOverlay').classList.add('show');playSoftChime();}
let pageWasHiddenForAR=false;document.addEventListener('visibilitychange',()=>{if(document.hidden&&arWasLaunched)pageWasHiddenForAR=true;if(!document.hidden&&arWasLaunched&&pageWasHiddenForAR){pageWasHiddenForAR=false;setTimeout(showPostAr,350);}});window.addEventListener('pageshow',()=>{if(arWasLaunched&&pageWasHiddenForAR){pageWasHiddenForAR=false;setTimeout(showPostAr,350);}});
