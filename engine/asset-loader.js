(function(){
  'use strict';
  const F=window.FionnEngine=window.FionnEngine||{};
  const availability=new Map();
  function variant(path,tier){
    if(tier==='standard') return path;
    const suffix=tier==='lite'?'-lite':'-enhanced';
    return path.replace(/(\.[a-z0-9]+)([?#].*)?$/i,`${suffix}$1$2`);
  }
  async function exists(url,timeout=3500){
    if(availability.has(url)) return availability.get(url);
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
    try{ const r=await fetch(url,{method:'HEAD',cache:'no-store',signal:controller.signal}); const ok=r.ok; availability.set(url,ok); return ok; }
    catch(_){availability.set(url,false);return false;} finally{clearTimeout(timer);}
  }
  F.resolveTieredAsset=async function(standardUrl,tier){
    if(!standardUrl) return standardUrl;
    const candidates=[];
    if(tier==='lite') candidates.push(variant(standardUrl,'lite'),standardUrl);
    else if(tier==='enhanced') candidates.push(variant(standardUrl,'enhanced'),standardUrl,variant(standardUrl,'lite'));
    else candidates.push(standardUrl,variant(standardUrl,'lite'));
    for(const url of [...new Set(candidates)]) if(await exists(url)) return url;
    return standardUrl;
  };
  F.withTimeout=function(promise,ms,message){
    return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message||'Timed out')),ms))]);
  };
})();
