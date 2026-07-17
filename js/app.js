async function initialiseFionn(){
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
