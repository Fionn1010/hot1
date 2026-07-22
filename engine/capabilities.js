(function(){
  'use strict';
  const F = window.FionnEngine = window.FionnEngine || {};
  function connectionInfo(){
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
    return {effectiveType:c.effectiveType||'unknown', downlink:Number(c.downlink)||0, saveData:Boolean(c.saveData), rtt:Number(c.rtt)||0};
  }
  function webglInfo(){
    try{
      const canvas=document.createElement('canvas');
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      if(!gl) return {supported:false,version:0,renderer:'none',maxTextureSize:0};
      const debug=gl.getExtension('WEBGL_debug_renderer_info');
      return {supported:true,version:gl instanceof WebGL2RenderingContext?2:1,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unknown',maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE)||0};
    }catch(_){ return {supported:false,version:0,renderer:'unknown',maxTextureSize:0}; }
  }
  function frameBenchmark(duration=420){
    return new Promise(resolve=>{
      let frames=0,start=performance.now(),last=start;
      function tick(now){ frames++; last=now; if(now-start<duration) requestAnimationFrame(tick); else resolve(Math.round(frames/((last-start)/1000))); }
      requestAnimationFrame(tick);
    });
  }
  F.measureCapabilities=async function(){
    const fps=await frameBenchmark();
    const connection=connectionInfo();
    const webgl=webglInfo();
    return {
      measuredAt:new Date().toISOString(),
      deviceMemory:Number(navigator.deviceMemory)||null,
      hardwareConcurrency:Number(navigator.hardwareConcurrency)||null,
      mobile:/Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      ios:/iPhone|iPad|iPod/i.test(navigator.userAgent),
      screenPixels:Math.round((screen.width||innerWidth)*(screen.height||innerHeight)*(devicePixelRatio||1)),
      fps, connection, webgl
    };
  };
})();
