(function(){
  'use strict';
  const F=window.FionnEngine=window.FionnEngine||{};
  function el(tag,props={}){const n=document.createElement(tag);Object.assign(n,props);return n;}
  function modal(){
    let m=document.getElementById('fionnPhotoModal'); if(m) return m;
    m=el('div',{id:'fionnPhotoModal',className:'fionn-modal'});
    m.innerHTML='<div class="fionn-modal-card" role="dialog" aria-modal="true" aria-labelledby="fionnPhotoTitle"><button class="fionn-close" aria-label="Close">×</button><h2 id="fionnPhotoTitle">Photo mode</h2><p><strong>Group photo:</strong> launch AR with the rear camera, place the characters, then ask one person to hold the phone while everyone else steps into the scene.</p><p><strong>Selfie:</strong> native iPhone and Android AR viewers do not currently let a webpage switch to the front camera while keeping the world anchor. Use the phone screenshot/camera control supplied by the AR viewer.</p><p class="fionn-small">A future custom WebXR compositor can add a true front-camera selfie where browser support allows it.</p></div>';
    document.body.appendChild(m); m.querySelector('.fionn-close').onclick=()=>m.classList.remove('show'); m.onclick=e=>{if(e.target===m)m.classList.remove('show');}; return m;
  }
  function diagnosticsText(){const q=F.quality||{};const c=q.capabilities||{};return `Selected: ${q.selected||'checking'}\nPreference: ${q.preference||'auto'}\nAutomatic: ${q.automatic||'—'}\nFPS test: ${c.fps||'—'}\nMemory: ${c.deviceMemory||'unknown'} GB\nCPU threads: ${c.hardwareConcurrency||'unknown'}\nNetwork: ${c.connection?.effectiveType||'unknown'}\nReason: ${(q.reasons||[]).join(', ')}`;}
  F.installControls=function(){
    if(document.getElementById('fionnControlBar')) return;
    const bar=el('nav',{id:'fionnControlBar',className:'fionn-control-bar'});
    bar.innerHTML='<button data-action="photo" aria-label="Photo guidance"><span>📷</span><small>Photo</small></button><button data-action="ar" aria-label="Launch augmented reality"><span>◈</span><small>AR</small></button><button data-action="reset" aria-label="Reset AR model"><span>↻</span><small>Reset</small></button><button data-action="quality" aria-label="Choose quality"><span>⚙</span><small>Quality</small></button><button data-action="exit" aria-label="Exit augmented reality section"><span>×</span><small>Exit</small></button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-action="photo"]').onclick=()=>modal().classList.add('show');
    bar.querySelector('[data-action="ar"]').onclick=()=>document.getElementById('launchAR')?.click();
    bar.querySelector('[data-action="reset"]').onclick=()=>{const mv=document.getElementById('modelViewer');if(mv){mv.cameraOrbit='auto auto auto';mv.cameraTarget='auto auto auto';mv.jumpCameraToGoal?.();} window.dispatchEvent(new CustomEvent('fionn-reset-ar'));};
    bar.querySelector('[data-action="exit"]').onclick=()=>{document.getElementById('arContinue')?.click();document.querySelector('.card')?.scrollIntoView({behavior:'smooth'});};
    bar.querySelector('[data-action="quality"]').onclick=()=>F.openQualityPanel();
  };
  F.openQualityPanel=function(){
    let p=document.getElementById('fionnQualityPanel');
    if(!p){p=el('div',{id:'fionnQualityPanel',className:'fionn-modal'});p.innerHTML='<div class="fionn-modal-card" role="dialog" aria-modal="true"><button class="fionn-close" aria-label="Close">×</button><h2>Experience quality</h2><label for="fionnQualitySelect">Choose content tier</label><select id="fionnQualitySelect"><option value="auto">Automatic</option><option value="lite">Lite</option><option value="standard">Standard</option><option value="enhanced">Enhanced</option></select><button class="fionn-apply">Apply and reload model</button><pre id="fionnDiagnostics"></pre></div>';document.body.appendChild(p);p.querySelector('.fionn-close').onclick=()=>p.classList.remove('show');p.querySelector('.fionn-apply').onclick=()=>{F.setQualityPreference(p.querySelector('select').value);location.reload();};}
    p.querySelector('select').value=F.getSavedQuality?.()||'auto';p.querySelector('#fionnDiagnostics').textContent=diagnosticsText();p.classList.add('show');
  };
})();
