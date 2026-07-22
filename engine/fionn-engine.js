(function(){
  'use strict';
  const scripts=['engine/capabilities.js','engine/quality-manager.js','engine/asset-loader.js','engine/ui-controls.js'];
  function load(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[data-fionn-src="${src}"]`))return resolve();const s=document.createElement('script');s.src=src;s.dataset.fionnSrc=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${src}`));document.head.appendChild(s);});}
  window.initialiseFionnEngine=async function(){for(const src of scripts) await load(src);const F=window.FionnEngine;const caps=await F.measureCapabilities();F.chooseQuality(caps);F.installControls();return F.quality;};
})();
