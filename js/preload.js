const FIONN_PRELOAD={
 registration:null,
 started:false,
 lastLanguage:null,

 async register(){
  if(!('serviceWorker' in navigator)) return false;
  try{
   this.registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
   await navigator.serviceWorker.ready;
   navigator.serviceWorker.addEventListener('message',event=>this.handleMessage(event.data));
   return true;
  }catch(error){
   console.warn('Fionn preload service unavailable:',error);
   return false;
  }
 },

 message(key){
  const text={
   preparing:{en:'Preparing the rest of your experience…',ga:'An chuid eile den eispéireas á hullmhú…',fr:'Préparation de la suite de votre expérience…',de:'Der Rest Ihres Erlebnisses wird vorbereitet…',es:'Preparando el resto de tu experiencia…',it:'Preparazione del resto dell’esperienza…',pt:'A preparar o resto da sua experiência…',zh:'正在准备接下来的体验…',hi:'आपके शेष अनुभव को तैयार किया जा रहा है…',th:'กำลังเตรียมประสบการณ์ส่วนที่เหลือ…'},
   ready:{en:'Experience ready for weaker reception.',ga:'Tá an t-eispéireas réidh do cheantair le comhartha níos laige.',fr:'L’expérience est prête pour les zones où le réseau est plus faible.',de:'Das Erlebnis ist für Bereiche mit schwächerem Empfang vorbereitet.',es:'La experiencia está lista para zonas con menor cobertura.',it:'L’esperienza è pronta per le aree con segnale più debole.',pt:'A experiência está pronta para zonas com sinal mais fraco.',zh:'体验已准备好，可在信号较弱的区域使用。',hi:'कमज़ोर नेटवर्क वाले क्षेत्रों के लिए अनुभव तैयार है।',th:'ประสบการณ์พร้อมใช้งานในบริเวณที่สัญญาณอ่อน'},
   limited:{en:'The next Heritage Stops are ready.',ga:'Tá na chéad Stadanna Oidhreachta eile réidh.',fr:'Les prochaines étapes patrimoniales sont prêtes.',de:'Die nächsten Heritage Stops sind vorbereitet.',es:'Las próximas paradas patrimoniales están listas.',it:'Le prossime tappe del patrimonio sono pronte.',pt:'As próximas paragens patrimoniais estão prontas.',zh:'接下来的站点已准备好。',hi:'अगले विरासत पड़ाव तैयार हैं।',th:'จุดแวะมรดกถัดไปพร้อมแล้ว'}
  };
  return text[key]?.[currentLanguage]||text[key]?.en||'';
 },

 show(message,autoHide=false){
  const el=$('preloadStatus');
  if(!el) return;
  el.innerHTML=message;
  el.classList.add('show');
  if(autoHide) setTimeout(()=>el.classList.remove('show'),4500);
 },

 async storageMode(){
  try{
   if(!navigator.storage?.estimate) return 'standard';
   const estimate=await navigator.storage.estimate();
   const free=Math.max(0,(estimate.quota||0)-(estimate.usage||0));
   if(free>500*1024*1024) return 'full';
   if(free>140*1024*1024) return 'standard';
   return 'limited';
  }catch{return 'standard'}
 },

 unique(items){return [...new Set(items.filter(Boolean))]},

 async buildQueue(){
  const mode=await this.storageMode();
  const order=[];
  for(let offset=0;offset<STOPS.length;offset++) order.push((current+offset)%STOPS.length);
  const selected=mode==='full'?order:mode==='standard'?order.slice(0,4):order.slice(0,2);

  const priority=[
   './','index.html','config/media.json','config/stops.json','config/site.json',
   `lang/${currentLanguage}.json`,'images/hero.jpg','thank you.png'
  ];
  const remaining=[];

  selected.forEach((index,position)=>{
   const stop=STOPS[index];
   const assets=[
    selectedVideoFile(stop,index)?`videos/${selectedVideoFile(stop,index)}`:null,
    stop.model?`models/${stop.model}`:null
   ];
   (position<2?priority:remaining).push(...assets);
  });

  return{mode,priority:this.unique(priority),remaining:this.unique(remaining)};
 },

 async start(){
  if(this.started&&this.lastLanguage===currentLanguage) return;
  this.started=true;
  this.lastLanguage=currentLanguage;
  if(!(await this.register())) return;

  const queue=await this.buildQueue();
  this.show(`<strong>Fionn</strong> · ${this.message('preparing')}`);
  const worker=this.registration.active||this.registration.waiting||this.registration.installing;
  worker?.postMessage({
   type:'FIONN_PRELOAD',
   experience:'011',
   language:currentLanguage,
   mode:queue.mode,
   priority:queue.priority,
   remaining:queue.remaining
  });
 },

 handleMessage(data){
  if(data?.type==='FIONN_PRELOAD_PROGRESS'){
   const percent=Math.round(((data.completed||0)/Math.max(1,data.total||1))*100);
   this.show(`<strong>Fionn</strong> · ${this.message('preparing')} ${percent}%`);
  }
  if(data?.type==='FIONN_PRELOAD_COMPLETE'){
   this.show(`<strong>Fionn</strong> · ${this.message(data.mode==='limited'?'limited':'ready')}`,true);
  }
 }
};
