/*
In the existing renderStop() function, replace local media assignment patterns:

storyVideo.src = stop.video;
modelViewer.src = stop.model;

with:

storyVideo.src = window.Fionn ? Fionn.asset("video", stop.video) : stop.video;
modelViewer.src = window.Fionn ? Fionn.asset("model", stop.model) : stop.model;

After the current stop is rendered:

const nextStop = stops[currentStopIndex + 1];
if (nextStop && window.Fionn) Fionn.prefetchStop(nextStop);
*/
