const LANGUAGE_PACK_FOLDER="lang";
let languagePackSource="Embedded translations";

function devModeEnabled(){
 const params=new URLSearchParams(window.location.search);
 return params.has("dev") || params.get("mode")==="dev" ||
        location.hostname==="localhost" || location.hostname==="127.0.0.1";
}

function initialiseDeveloperTools(){
 const panel=$("developerTools");
 if(!panel) return;
 panel.hidden=!devModeEnabled();
 if(panel.hidden) return;

 document.querySelectorAll("[data-dev-lang]").forEach(button=>{
  button.addEventListener("click",()=>testAndApplyLanguagePack(button.dataset.devLang,button));
 });

 $("testAllLanguagePacks")?.addEventListener("click",testAllLanguagePacks);
 $("useDetectedLanguage")?.addEventListener("click",async()=>{
  const code=detectLanguage();
  await testAndApplyLanguagePack(code);
 });
 $("clearLanguageChoice")?.addEventListener("click",()=>{
  localStorage.removeItem("taraLanguage");
  setDeveloperStatus("Saved language removed. Reload the page to test automatic detection.","ok");
  updateLanguageDiagnostics();
 });
 updateLanguageDiagnostics();
}


function initialiseSceneTesting(){
 const holder=$("devSceneButtons");
 if(!holder) return;
 holder.innerHTML="";
 STOPS.forEach((stop,index)=>{
  const button=document.createElement("button");
  button.type="button";
  button.className="devLangBtn";
  button.textContent=`${index+1}. ${stop.title.replace(/^THE /,"")}`;
  button.addEventListener("click",()=>{
   current=index;
   savedStop=index;
   renderStop(false);
   hideGate();
   document.querySelector(".section.ar")?.scrollIntoView({behavior:"smooth",block:"start"});
   updateSceneTestingButtons();
  });
  holder.appendChild(button);
 });
 $("testCurrentAR")?.addEventListener("click",async()=>{
  hideGate();
  document.querySelector(".section.ar")?.scrollIntoView({behavior:"smooth",block:"start"});
  await launchCurrentAR();
 });
 $("testCurrentVideo")?.addEventListener("click",()=>{
  hideGate();
  storyCompletionHandled=false;
  openStoryCinema();
 });
 updateSceneTestingButtons();
}

function updateSceneTestingButtons(){
 document.querySelectorAll("#devSceneButtons button").forEach((button,index)=>{
  button.classList.toggle("active",index===current);
 });
}

function applyDirectTestStop(){
 if(!devModeEnabled()) return;
 const params=new URLSearchParams(window.location.search);
 const raw=params.get("stop") || params.get("scene");
 if(!raw) return;
 const requested=Number.parseInt(raw,10);
 if(Number.isFinite(requested)){
  current=Math.max(0,Math.min(requested-1,STOPS.length-1));
  savedStop=current;
  renderStop(false);
  hideGate();
 }
}

function expectedPackPath(code){
 return code==="en" ? "Built into index.html" : `${LANGUAGE_PACK_FOLDER}/${code}.json`;
}

function setDeveloperStatus(message,type="ok"){
 const box=$("languagePackStatus");
 if(!box) return;
 box.textContent=message;
 box.classList.remove("error","testing");
 if(type==="error") box.classList.add("error");
 if(type==="testing") box.classList.add("testing");
}

function updateLanguageDiagnostics(){
 if(!$("languageDiagnostics")) return;
 const phone=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||"en"]);
 const detected=detectLanguage();
 $("diagPhoneLanguages").textContent=phone.join(", ");
 $("diagDetectedLanguage").textContent=`${detected} (${LANGUAGES[detected]?.name||"fallback"})`;
 $("diagActiveLanguage").textContent=`${currentLanguage} (${LANGUAGES[currentLanguage]?.name||"English"})`;
 $("diagLoadedSource").textContent=languagePackSource;
 $("diagPackPath").textContent=expectedPackPath(currentLanguage);

 document.querySelectorAll("[data-dev-lang]").forEach(button=>{
  button.classList.toggle("active",button.dataset.devLang===currentLanguage);
 });
}

function validateLanguagePack(pack,code){
 if(!pack || typeof pack!=="object") throw new Error("The JSON file is empty or invalid.");
 if(pack.language && pack.language!==code){
  throw new Error(`The pack identifies itself as "${pack.language}", not "${code}".`);
 }
 if(!pack.ui || typeof pack.ui!=="object") throw new Error('Missing the "ui" section.');
 if(!Array.isArray(pack.stops) || pack.stops.length!==STOPS.length){
  throw new Error(`Expected ${STOPS.length} translated stops.`);
 }
 for(let i=0;i<pack.stops.length;i++){
  const stop=pack.stops[i];
  if(!stop.title || !stop.subtitle || !stop.primaryAction){
   throw new Error(`Stop ${i+1} is missing a title, subtitle or primaryAction.`);
  }
 }
 return true;
}

function installLanguagePack(pack,code){
 UI[code]={...UI.en,...pack.ui};
 STOP_I18N[code]=pack.stops.map(stop=>[
  stop.title,
  stop.subtitle,
  stop.primaryAction
 ]);
 if(!LANGUAGES[code]){
  LANGUAGES[code]={
   name:pack.languageName||pack.englishName||code,
   locale:pack.locale||code
  };
 }
}

async function loadExternalLanguagePack(code){
 if(code==="en"){
  languagePackSource="Embedded English in index.html";
  return {embedded:true};
 }
 const path=`${LANGUAGE_PACK_FOLDER}/${code}.json`;
 const response=await fetch(`${path}?v=${Date.now()}`,{cache:"no-store"});
 if(!response.ok) throw new Error(`${response.status} ${response.statusText} while loading ${path}`);
 const pack=await response.json();
 validateLanguagePack(pack,code);
 installLanguagePack(pack,code);
 languagePackSource=path;
 return pack;
}

async function testAndApplyLanguagePack(code,button=null){
 const selected=LANGUAGES[code]?.name||code;
 const targetButton=button||document.querySelector(`[data-dev-lang="${code}"]`);
 targetButton?.classList.remove("failed");
 targetButton?.classList.add("loading");
 setDeveloperStatus(`Testing ${selected}…`,"testing");

 try{
  await loadExternalLanguagePack(code);
  setLanguage(code);
  setDeveloperStatus(
   code==="en"
    ? "✓ English is built into index.html and applied successfully."
    : `✓ ${expectedPackPath(code)} loaded, validated and applied successfully.`,
   "ok"
  );
 }catch(error){
  console.error("Language-pack test failed:",error);
  targetButton?.classList.add("failed");
  setDeveloperStatus(`✗ ${selected} failed: ${error.message}`,"error");
 }finally{
  targetButton?.classList.remove("loading");
  updateLanguageDiagnostics();
 }
}

async function testAllLanguagePacks(){
 const codes=["fr","de","es","it","pt","hi","zh","th"];
 const results=[];
 setDeveloperStatus("Testing all eight JSON language packs…","testing");

 for(const code of codes){
  const button=document.querySelector(`[data-dev-lang="${code}"]`);
  button?.classList.remove("failed");
  button?.classList.add("loading");
  try{
   await loadExternalLanguagePack(code);
   results.push({code,ok:true});
  }catch(error){
   results.push({code,ok:false,error:error.message});
   button?.classList.add("failed");
  }finally{
   button?.classList.remove("loading");
  }
 }

 const failed=results.filter(result=>!result.ok);
 if(failed.length){
  setDeveloperStatus(
   `✗ ${failed.length} pack(s) failed: ${failed.map(item=>`${item.code} (${item.error})`).join("; ")}`,
   "error"
  );
 }else{
  setDeveloperStatus("✓ All eight JSON language packs loaded and validated successfully.","ok");
 }
 updateLanguageDiagnostics();
}
