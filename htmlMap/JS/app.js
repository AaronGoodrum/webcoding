
require([
  "esri/Map",
  "esri/views/MapView",
  "dojo/domReady!"
], function(Map, MapView) {
  // Code to create the map and view will go here
  var map = new Map({
    basemap: "streets"
  });

  var view = new MapView({
    container: "viewDiv",  // Reference to the scene div created in step 5
    map: map,  // Reference to the map object created before the scene
    zoom: 4,  // Sets zoom level based on level of detail (LOD)
    center: [-122, 47]  // Sets center point of view using longitude,latitude
  });
});


var searchWidget = new Search({
  view: view
});
// Adds the search widget below other elements in
// the top left corner of the view
view.ui.add(searchWidget, {
  position: "top-left",
  index: 2
});


require(["esri/widgets/Search"], function(Search) { /* code goes here */ });

require(["esri/tasks/Locator"], function(Locator) { /* code goes here */ });
