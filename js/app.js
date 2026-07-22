async function initialiseFionn(){
  const css=document.createElement('link');css.rel='stylesheet';css.href='css/fionn-engine.css';document.head.appendChild(css);
  try{
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='engine/fionn-engine.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
    await window.initialiseFionnEngine();
  }catch(error){console.warn('Fionn adaptive engine did not start; continuing in Standard mode.',error);window.FionnEngine=window.FionnEngine||{quality:{selected:'standard'}};}
  FIONN_PRELOAD.register();
  await loadMediaCatalog();
  currentLanguage=detectLanguage();
  populateLanguageSelectors();
  applyTranslations();
  renderStop(false);
  showGateOptions();
  initialiseDeveloperTools();
  initialiseSceneTesting();
  applyDirectTestStop();
  updateSceneTestingButtons();
}
initialiseFionn();
