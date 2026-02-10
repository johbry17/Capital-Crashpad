// Description: This file contains the functions to create the map and controls, and to handle user interactions

// global for tracking map state and active layers
const mapState = {
  map: null,
  baseLayer: null,
  overlays: {},

  markerScheme: "default",
  markerLayer: null,

  choroplethLayer: null,
  bubbleLayer: null,
  neighborhoodsLayer: null,

  currentOverlay: null,
  legend: null,
  selectedNeighborhood: "top",
};

// map creation
function createMap(neighborhoods, listingsData, statsByNeighborhood) {
  const map = initializeMap();
  mapState.map = map;
  const markerGroups = initializeMarkerGroups(listingsData);
  mapState.overlays = initializeOverlays(
    map,
    markerGroups,
    neighborhoods,
    listingsData,
    statsByNeighborhood,
  );

  addBaseLayerControl(map);

  // initialize dropdown, neighborhood and choropleth layers
  neighborhoodsControl(map, neighborhoods, listingsData, statsByNeighborhood); // includes neighborhood layer
  // mapState.choroplethLayer = mapState.overlays["Median Price"];
  // mapState.markerLayer = markerGroups.default; // set initial marker layer

  // event listeners for resizing
  window.addEventListener("resize", () => {
    map.invalidateSize();
    resizePlots();
  });

  // resize map to ensure it loads correctly
  map.invalidateSize();

  // sync dropdown and overlays with initial values
  syncDropdownAndOverlay(
    map,
    "top",
    "Airbnb's",
    listingsData,
    statsByNeighborhood,
  );

  // event listener for overlay changes
  document
    .getElementById("overlay-control")
    .addEventListener("click", handleOverlayClick);

  // change overlay based on click
  function handleOverlayClick(e) {
    const selectedOverlay = e.target.getAttribute("data-overlay");
    mapState.selectedNeighborhood =
      document.getElementById("neighborhoods-dropdown").value || "top";
    if (selectedOverlay && mapState.overlays[selectedOverlay]) {
      // track current overlay in mapState for use in neighborhood dropdown changes
      mapState.currentOverlay = selectedOverlay;
      syncDropdownAndOverlay(
        mapState.map,
        mapState.selectedNeighborhood,
        selectedOverlay,
        listingsData,
        statsByNeighborhood,
      );
    }
  }
}

// initialize the map
function initializeMap() {
  mapState.baseLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  );
  const map = L.map("map-id", {
    center: [38.89511, -77.03637],
    zoom: 12,
    layers: [mapState.baseLayer],
  });
  addResetButton(map);
  return map;
}

// add reset button to map
function addResetButton(map) {
  const resetControl = L.control({ position: "topleft" });

  resetControl.onAdd = () => {
    const button = L.DomUtil.create("button", "reset-map-button");
    button.type = "button"; // prevent weird form submission behavior (default is "submit")
    button.innerHTML = '<i class="fas fa-sync"></i>'; // refresh icon
    button.title = "Return map to Washington, D.C. view"; // tooltip text
    button.setAttribute("aria-label", "Reset map to Washington, D.C. view"); // accessibility label

    // prevent map interactions when clicking the button
    L.DomEvent.disableClickPropagation(button);

    button.addEventListener("click", () => {
      map.setView([38.89511, -77.03637], 12); // reset to initial view
    });

    return button;
  };

  resetControl.addTo(map);
}

// initialize marker groups
function initializeMarkerGroups(listingsData) {
  return {
    default: createMarkers(listingsData),
    license: createMarkers(listingsData, "license"),
    propertyType: createMarkers(listingsData, "propertyType"),
  };
}

// initialize overlays
function initializeOverlays(
  map,
  markerGroups,
  neighborhoods,
  listingsData,
  statsByNeighborhood,
) {
  return {
    "Airbnb's": markerGroups.default,
    "License Status": markerGroups.license,
    "Property Type": markerGroups.propertyType,
    "Median Price": initializeChoroplethLayer(
      map,
      neighborhoods,
      listingsData,
      statsByNeighborhood,
    ),
    "Total Airbnbs": initializeBubbleChartLayer(
      neighborhoods,
      statsByNeighborhood,
    ),
  };
}

// add the base layers and control
function addBaseLayerControl(map) {
  let baseMap = {
    "Street Map": L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ),
    Satellite: L.esri.basemapLayer("Imagery"),
    "National Geographic": L.esri.basemapLayer("NationalGeographic"),
    Topographic: L.esri.basemapLayer("Topographic"),
    Grayscale: L.esri.basemapLayer("Gray"),
  };
  L.control.layers(baseMap, null).addTo(map);
}

// sync dropdown and overlays
function syncDropdownAndOverlay(
  map,
  selectedNeighborhood,
  selectedOverlayName,
  listingsData,
  statsByNeighborhood,
) {
  // remove all existing overlays
  clearOverlays();

  // update overlays
  // choropleth layer
  if (selectedOverlayName === "Median Price") {
    const choroplethLayer = mapState.overlays["Median Price"];
    // reset style if re-adding existing layer
    if (choroplethLayer && choroplethLayer._choropleth) {
      choroplethLayer._choropleth.resetStyle();
    }
    map.addLayer(choroplethLayer);
    mapState.choroplethLayer = choroplethLayer;
    mapState.legend = addLegend("Median Price").addTo(map);
    // if necessary, update plots and reset map view
    if (selectedNeighborhood === "top") {
      resetMapView(map, listingsData, statsByNeighborhood);
    }
    // bubble chart layer
  } else if (selectedOverlayName === "Total Airbnbs") {
    const bubbleLayer = mapState.overlays["Total Airbnbs"];
    map.addLayer(bubbleLayer);
    mapState.bubbleLayer = bubbleLayer;
    mapState.legend = null;
    // marker overlays
  } else {
    renderMarkerOverlay(
      map,
      selectedOverlayName,
      listingsData,
      selectedNeighborhood,
    );
    // update plots and reset map view
    if (selectedNeighborhood === "top") {
      resetMapView(map, listingsData, statsByNeighborhood);
    } else {
      zoomIn(map, selectedNeighborhood, listingsData, statsByNeighborhood);
    }
  }
}

function clearOverlays() {
  const { map } = mapState;

  // Remove existing overlay layers
  if (mapState.markerLayer) {
    map.removeLayer(mapState.markerLayer);
    mapState.markerLayer = null;
  }

  if (mapState.choroplethLayer) {
    map.removeLayer(mapState.choroplethLayer);
    mapState.choroplethLayer = null;
  }

  if (mapState.bubbleLayer) {
    map.removeLayer(mapState.bubbleLayer);
    mapState.bubbleLayer = null;
  }

  if (mapState.legend) {
    map.removeControl(mapState.legend);
    mapState.legend = null;
  }
}

// update the overlay
function renderMarkerOverlay(
  map,
  overlayName,
  listingsData,
  selectedNeighborhood,
) {
  // filter listings by neighborhood
  const filteredListings = filterListingsByNeighborhood(
    listingsData,
    selectedNeighborhood,
  );

  // set active overlay and legend based on overlay name
  if (overlayName === "License Status") {
    mapState.markerLayer = createMarkers(filteredListings, "license");
    mapState.markerScheme = "license";
    mapState.legend = addLegend("License Status").addTo(map);
  } else if (overlayName === "Property Type") {
    mapState.markerLayer = createMarkers(filteredListings, "propertyType");
    mapState.markerScheme = "propertyType";
    mapState.legend = addLegend("Property Type").addTo(map);
  } else {
    mapState.markerLayer = createMarkers(filteredListings);
    mapState.markerScheme = "default";
    mapState.legend = null;
  }

  // add new overlay
  map.addLayer(mapState.markerLayer);
}

// create dropdown for neighborhood interaction
function neighborhoodsControl(
  map,
  neighborhoodsInfo,
  listingsData,
  statsByNeighborhood,
) {
  const controlDiv = document.getElementById("neighborhoods-control");
  const dropdown = createNeighborhoodDropdown(neighborhoodsInfo);
  controlDiv.appendChild(dropdown);

  // create neighborhoods layer but don't add it to the map yet
  mapState.neighborhoodsLayer = initializeNeighborhoodsLayer(
    map,
    neighborhoodsInfo,
    listingsData,
    statsByNeighborhood,
  );

  // add event listener for dropdown changes
  addDropdownChangeListener(dropdown, map, listingsData, statsByNeighborhood);
}

// create neighborhood dropdown elements
function createNeighborhoodDropdown(neighborhoodsInfo) {
  const dropdown = document.createElement("select");
  dropdown.id = "neighborhoods-dropdown";

  // sort neighborhoods alphabetically
  neighborhoodsInfo.features.sort((a, b) =>
    a.properties.neighbourhood.localeCompare(b.properties.neighbourhood),
  );

  // populate dropdown menu, DC first, then sorted neighborhoods
  const allDC = createOption("Washington, D.C.", "top");
  dropdown.appendChild(allDC);
  neighborhoodsInfo.features.forEach((feature) => {
    const option = createOption(
      feature.properties.neighbourhood,
      feature.properties.neighbourhood,
    );
    option.setAttribute(
      "aria-label",
      `Neighborhood: ${feature.properties.neighbourhood}`,
    );
    dropdown.appendChild(option);
  });

  return dropdown;
}

// event listener for dropdown changes
function addDropdownChangeListener(
  dropdown,
  map,
  listingsData,
  statsByNeighborhood,
) {
  dropdown.addEventListener("change", function () {
    const selectedNeighborhood = this.value;
    mapState.selectedNeighborhood = selectedNeighborhood;
    syncDropdownAndOverlay(
      map,
      selectedNeighborhood,
      mapState.currentOverlay || "Airbnb's",
      listingsData,
      statsByNeighborhood,
    );
  });
}

// create dropdown options
function createOption(text, value) {
  const option = document.createElement("option");
  option.text = text;
  option.value = value;
  return option;
}

// enable || disable buttons
function toggleButton(buttonId, enable = true) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = !enable;
    // button.style.display = enable ? 'block' : 'none'; // use if visibility needs changing
  }
}

// resets map view to all of D.C., updates infoBox and plots
function resetMapView(map, listingsData, statsByNeighborhood) {
  // center map on D.C. and reset zoom
  map.setView([38.89511, -77.03637], 12);
  // reset choropleth layer style if active to remove neighborhood boundary highlight
  if (mapState.choroplethLayer && mapState.choroplethLayer._choropleth) {
    mapState.choroplethLayer._choropleth.resetStyle();
  }
  // remove neighborhood boundaries from zoomIn()
  if (
    mapState.neighborhoodsLayer &&
    map.hasLayer(mapState.neighborhoodsLayer)
  ) {
    map.removeLayer(mapState.neighborhoodsLayer);
  }

  // update infoBox and plots
  updateInfoBox(listingsData, "Washington, D.C.");
  update31DaysInfoBox(listingsData, "Washington, D.C.");
  updateMultiListings(listingsData, "Washington, D.C.");
  allDCPlots(listingsData, statsByNeighborhood, defaultColors);

  // toggle button
  toggleButton("total-airbnbs-button", true);
}

// zooms map for neighborhood view, updates infoBox and plots
function zoomIn(map, selectedNeighborhood, listingsData, statsByNeighborhood) {
  // toggle buttons and choropleth Median Price legend
  toggleButton("total-airbnbs-button", false);

  // remove existing choropleth layer
  if (mapState.choroplethLayer && map.hasLayer(mapState.choroplethLayer)) {
    map.removeLayer(mapState.choroplethLayer);
    mapState.choroplethLayer = null;
  }

  // remove previous neighborhood boundaries (or they will remain uncovered)
  mapState.neighborhoodsLayer.resetStyle();

  // get neighborhood boundaries
  const boundaries = mapState.neighborhoodsLayer
    .getLayers()
    .find(
      (layer) =>
        layer.feature.properties.neighbourhood === selectedNeighborhood,
    );

  // update map view
  if (boundaries) {
    // reset choropleth layer style if active to remove previous neighborhood boundary highlight
    if (
      mapState.neighborhoodsLayer &&
      mapState.neighborhoodsLayer._choropleth
    ) {
      mapState.neighborhoodsLayer._choropleth.resetStyle();
    }
    // set style for selected neighborhood
    boundaries.setStyle({ weight: 3, color: "transparent" });
    boundaries.setStyle({ fillOpacity: 0, opacity: 0 });

    // zoom to neighborhood boundaries
    map.fitBounds(boundaries.getBounds());

    // filter listings by neighbourhood
    const filteredListings = filterListingsByNeighborhood(
      listingsData,
      selectedNeighborhood,
    );

    // add layers
    mapState.neighborhoodsLayer.addTo(map);

    // remove previous markers and add new ones with appropriate color scheme
    if (mapState.markerLayer) {
      map.removeLayer(mapState.markerLayer);
    }
    mapState.markerLayer = createMarkers(
      filteredListings,
      mapState.markerScheme,
    );
    map.addLayer(mapState.markerLayer);

    // update infoBox, and plots
    updateInfoBox(listingsData, selectedNeighborhood);
    update31DaysInfoBox(listingsData, selectedNeighborhood);
    updateMultiListings(listingsData, selectedNeighborhood);
    neighborhoodPlots(
      listingsData,
      selectedNeighborhood,
      statsByNeighborhood,
      defaultColors,
    );
  }
}
