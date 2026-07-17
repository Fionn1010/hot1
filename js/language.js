let currentLanguage="en";
function detectLanguage(){
 const saved=localStorage.getItem("taraLanguage");
 if(saved && LANGUAGES[saved]) return saved;
 const preferred=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||"en"]);
 for(const item of preferred){
  const base=String(item).toLowerCase().split("-")[0];
  if(LANGUAGES[base]) return base;
 }
 return "en";
}
function translatedStop(index){
 const pack=STOP_I18N[currentLanguage]||STOP_I18N.en;
 const row=pack[index]||STOP_I18N.en[index];
 return {title:row[0],subtitle:row[1],action:row[2]};
}
function populateLanguageSelectors(){
 for(const id of ["languageSelect","gateLanguageSelect"]){
  const select=$(id); if(!select) continue;
  select.innerHTML="";
  Object.entries(LANGUAGES).forEach(([code,info])=>{
   const option=document.createElement("option");
   option.value=code; option.textContent=info.name; select.appendChild(option);
  });
  select.value=currentLanguage;
  select.addEventListener("change",()=>setLanguage(select.value));
 }
}
function setLanguage(code){
 currentLanguage=LANGUAGES[code]?code:"en";
 localStorage.setItem("taraLanguage",currentLanguage);
 document.documentElement.lang=LANGUAGES[currentLanguage].locale;
 for(const id of ["languageSelect","gateLanguageSelect"]){const el=$(id);if(el)el.value=currentLanguage}
 applyTranslations();
 renderStop(false);
 showGateOptions();
 updateLanguageDiagnostics();
 initialiseSceneTesting();
}
function applyTranslations(){
 const t=UI[currentLanguage]||UI.en;
 const text={
  heroTagline:t.heroTagline,languageLabel:t.language,gateLanguageLabel:t.language,
  gpsTitle:t.gpsTitle,gpsSubtitle:t.gpsSubtitle,destinationLabel:t.destination,
  gpsBtn:t.enableGps,jumpCurrent:t.jumpCurrent,gpsNote:t.gpsNote,beginHint:t.beginHint,
  storyDone:t.storyDone,arLabel:t.arLabel,arTitle:t.arTitle,arText:t.arText,
  photoTipMain:t.photoMain,photoTipSmall:t.photoSmall,startEntrance:t.startEntrance,
  resumeTour:t.resume,jumpNearest:t.jumpNearest,gateNote:t.gateNote,
  returnStart:t.returnStart,discoverMeath:t.discoverMeath,thanksTitle:t.thanks,stopAll:t.stopVideo,transitionAR:t.stepIntoHistory||UI.en.stepIntoHistory,postArTitle:t.excellent||UI.en.excellent,continueAfterAR:t.continue||UI.en.continue
 };
 Object.entries(text).forEach(([id,value])=>{const el=$(id);if(el)el.textContent=value});
 const gate=$("gateTitle"); if(gate)gate.innerHTML=t.welcome;
 const intro=$("gateIntro"); if(intro)intro.textContent=t.gateIntro;
 updateCompass();
}
