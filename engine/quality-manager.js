(function(){
  'use strict';
  const F=window.FionnEngine=window.FionnEngine||{};
  const KEY='fionnQualityPreference';
  function autoTier(c){
    let score=0,reasons=[];
    if(c.connection.saveData){score-=4;reasons.push('Data Saver is enabled');}
    if(['slow-2g','2g'].includes(c.connection.effectiveType)){score-=4;reasons.push('very slow connection');}
    else if(c.connection.effectiveType==='3g'){score-=2;reasons.push('3G connection');}
    else if(c.connection.downlink>=8){score+=2;reasons.push('fast connection');}
    if(c.deviceMemory!==null){if(c.deviceMemory<=2){score-=3;reasons.push('limited device memory');}else if(c.deviceMemory>=8){score+=2;reasons.push('high device memory');}}
    if(c.hardwareConcurrency!==null){if(c.hardwareConcurrency<=4){score-=2;reasons.push('fewer CPU cores');}else if(c.hardwareConcurrency>=8){score+=2;reasons.push('more CPU cores');}}
    if(!c.webgl.supported){score-=6;reasons.push('WebGL unavailable');}
    else {if(c.webgl.version===2) score+=1; if(c.webgl.maxTextureSize>=8192) score+=1;}
    if(c.fps<40){score-=3;reasons.push('low measured frame rate');}else if(c.fps>=56){score+=2;reasons.push('smooth measured frame rate');}
    if(c.screenPixels>8000000) score-=1;
    const tier=score<=-3?'lite':score>=5?'enhanced':'standard';
    return {tier,score,reasons:reasons.length?reasons:['balanced default']};
  }
  F.getSavedQuality=()=>localStorage.getItem(KEY)||'auto';
  F.setQualityPreference=value=>{ if(!['auto','lite','standard','enhanced'].includes(value)) value='auto'; localStorage.setItem(KEY,value); return value; };
  F.chooseQuality=function(capabilities){
    const auto=autoTier(capabilities), preference=F.getSavedQuality();
    const selected=preference==='auto'?auto.tier:preference;
    F.quality={selected,preference,automatic:auto.tier,score:auto.score,reasons:auto.reasons,capabilities};
    document.documentElement.dataset.fionnTier=selected;
    window.dispatchEvent(new CustomEvent('fionn-quality-ready',{detail:F.quality}));
    return F.quality;
  };
})();
