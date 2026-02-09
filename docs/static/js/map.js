// Description: This file contains the functions to create the map and controls, and to handle user interactions

// global variables for tracking map state
let activeLegend = null;
let baseLayer = null;
let neighborhoodsLayer = null;
let activeMarkerLayer = null;
let currentMarkerScheme = "default";
let activeChoropleth = null;

const mapState = {
  map: null,
  baseLayer: null,

  markerScheme: "default",
  markerLayer: null,

  choroplethLayer: null,
  bubbleLayer: null,
  neighborhoodsLayer: null,

  legend: null,
  activeOverlay: "Airbnb's",
  selectedNeighborhood: "top",
};

// map creation
function createMap(neighborhoods, listingsData, statsByNeighborhood) {
  const map = initializeMap();
  mapState.map = map;
  const markerGroups = initializeMarkerGroups(listingsData);
  const overlays = initializeOverlays(
    map,
    markerGroups,
    neighborhoods,
    listingsData,
    statsByNeighborhood,
  );

  addBaseLayerControl(map);

  // initialize dropdown, neighborhood and choropleth layers
  neighborhoodsControl(map, neighborhoods, listingsData, statsByNeighborhood); // includes neighborhood layer
  const choroplethLayer = overlays["Median Price"];
  activeMarkerLayer = markerGroups.default; // set initial marker layer

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
    overlays,
    listingsData,
    statsByNeighborhood,
    neighborhoods,
    choroplethLayer,
  );

  // event listener for overlay changes
  document
    .getElementById("overlay-control")
    .addEventListener("click", handleOverlayClick);

  // change overlay based on click
  function handleOverlayClick(e) {
    const selectedOverlay = e.target.getAttribute("data-overlay");
    if (selectedOverlay && overlays[selectedOverlay]) {
      syncDropdownAndOverlay(
        map,
        document.getElementById("neighborhoods-dropdown").value,
        selectedOverlay,
        overlays,
        listingsData,
        statsByNeighborhood,
        neighborhoods,
        choroplethLayer,
      );
    }
  }
}

// initialize the map
function initializeMap() {
  baseLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  );
  const map = L.map("map-id", {
    center: [38.89511, -77.03637],
    zoom: 12,
    layers: [baseLayer],
  });
  addResetButton(map);
  return map;
}

// add reset button to map
function addResetButton(map = mapState.map) {
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
  map = mapState.map,
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
function addBaseLayerControl(map = mapState.map) {
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
  map = mapState.map,
  selectedNeighborhood,
  selectedOverlayName,
  overlays,
  listingsData,
  statsByNeighborhood,
  neighborhoods,
  choroplethLayer,
) {
  // remove all existing overlays
  removeOverlays(map);

  // update overlays
  // choropleth layer
  if (selectedOverlayName === "Median Price") {
    if (choroplethLayer && choroplethLayer._choropleth) {
      choroplethLayer._choropleth.resetStyle();
    }
    if (activeChoropleth) {
      map.removeLayer(activeChoropleth);
    }
    map.addLayer(choroplethLayer);
    activeChoropleth = choroplethLayer;
    activeLegend = addLegend("Median Price").addTo(map);
    // bubble chart layer
  } else if (selectedOverlayName === "Total Airbnbs") {
    const bubbleLayer = initializeBubbleChartLayer(
      neighborhoods,
      statsByNeighborhood,
    );
    if (map._activeBubbleLayer) {
      map.removeLayer(map._activeBubbleLayer);
    }
    map.addLayer(bubbleLayer);
    map._activeBubbleLayer = bubbleLayer;
    activeLegend = null;
    // marker overlays
  } else {
    activateMarkerOverlay(
      map,
      selectedOverlayName,
      listingsData,
      selectedNeighborhood,
      statsByNeighborhood,
    );
  }
}

// remove overlay from map
function removeOverlays(map = mapState.map) {
  // remove choropleth
  if (activeChoropleth && map.hasLayer(activeChoropleth)) {
    map.removeLayer(activeChoropleth);
    activeChoropleth = null;
  }

  // remove bubble layer
  if (map._activeBubbleLayer && map.hasLayer(map._activeBubbleLayer)) {
    map.removeLayer(map._activeBubbleLayer);
    map._activeBubbleLayer = null;
  }

  // remove legend
  if (activeLegend) {
    map.removeControl(activeLegend);
    activeLegend = null;
  }
}

// add marker overlay to map
function activateMarkerOverlay(
  map = mapState.map,
  selectedOverlayName,
  listingsData,
  selectedNeighborhood,
  statsByNeighborhood,
) {
  updateMarkerOverlay(
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

// update the overlay
function updateMarkerOverlay(
  map = mapState.map,
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
    if (activeMarkerLayer) {
      map.removeLayer(activeMarkerLayer);
    }

    activeMarkerLayer = createMarkers(filteredListings, "license");
    currentMarkerScheme = "license";
    activeLegend = addLegend("License Status").addTo(map);
  } else if (overlayName === "Property Type") {
    if (activeMarkerLayer) {
      map.removeLayer(activeMarkerLayer);
    }

    activeMarkerLayer = createMarkers(filteredListings, "propertyType");
    currentMarkerScheme = "propertyType";
    activeLegend = addLegend("Property Type").addTo(map);
  } else {
    if (activeMarkerLayer) {
      map.removeLayer(activeMarkerLayer);
    }

    activeMarkerLayer = createMarkers(filteredListings);
    currentMarkerScheme = "default";
    activeLegend = null;
  }

  // add new overlay
  map.addLayer(activeMarkerLayer);

  return activeMarkerLayer;
}

// create dropdown for neighborhood interaction
function neighborhoodsControl(
  map = mapState.map,
  neighborhoodsInfo,
  listingsData,
  statsByNeighborhood,
) {
  const controlDiv = document.getElementById("neighborhoods-control");
  const dropdown = createNeighborhoodDropdown(neighborhoodsInfo);
  controlDiv.appendChild(dropdown);

  // create neighborhoods layer but don't add it to the map yet
  neighborhoodsLayer = initializeNeighborhoodsLayer(
    map,
    neighborhoodsInfo,
    listingsData,
    statsByNeighborhood,
  );

  // add event listener for dropdown changes
  addDropdownChangeListener(
    dropdown,
    map,
    neighborhoodsLayer,
    listingsData,
    statsByNeighborhood,
  );
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
  map = mapState.map,
  neighborhoodsLayer,
  listingsData,
  statsByNeighborhood,
) {
  dropdown.addEventListener("change", function () {
    const selectedNeighborhood = this.value;
    if (selectedNeighborhood === "top") {
      resetMapView(map, listingsData, statsByNeighborhood);
    } else {
      zoomIn(map, selectedNeighborhood, listingsData, statsByNeighborhood);
    }
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
function resetMapView(map = mapState.map, listingsData, statsByNeighborhood) {
  // center map on D.C. and reset zoom
  map.setView([38.89511, -77.03637], 12);
  // reset choropleth layer style if active to remove neighborhood boundary highlight
  if (activeChoropleth && activeChoropleth._choropleth) {
    activeChoropleth._choropleth.resetStyle();
  }
  // remove neighborhood boundaries from zoomIn()
  if (neighborhoodsLayer && map.hasLayer(neighborhoodsLayer)) {
    map.removeLayer(neighborhoodsLayer);
  }

  // update markers with appropriate color scheme, infoBox, and plots
  if (activeMarkerLayer) {
    map.removeLayer(activeMarkerLayer);
  }

  activeMarkerLayer = createMarkers(listingsData, currentMarkerScheme);
  map.addLayer(activeMarkerLayer);
  updateInfoBox(listingsData, "Washington, D.C.");
  update31DaysInfoBox(listingsData, "Washington, D.C.");
  updateMultiListings(listingsData, "Washington, D.C.");
  allDCPlots(listingsData, statsByNeighborhood, defaultColors);

  // toggle median price button
  // toggleButton("median-price-button", true);
  toggleButton("total-airbnbs-button", true);
}

// zooms map for neighborhood view, updates infoBox and plots
function zoomIn(map = mapState.map, selectedNeighborhood, listingsData, statsByNeighborhood) {
  // toggle buttons and choropleth Median Price legend
  toggleButton("total-airbnbs-button", false);
  // toggleButton("median-price-button", false);
  // if (
  //   activeLegend &&
  //   activeLegend._container.innerHTML.includes("Median Price")
  // ) {
  //   activeLegend._container.style.display = "none";
  // }

  // remove existing choropleth layer
  if (activeChoropleth && map.hasLayer(activeChoropleth)) {
    map.removeLayer(activeChoropleth);
    activeChoropleth = null;
  }

  // remove previous neighborhood boundaries (or they will remain uncovered)
  neighborhoodsLayer.resetStyle();

  // get neighborhood boundaries
  const boundaries = neighborhoodsLayer
    .getLayers()
    .find(
      (layer) =>
        layer.feature.properties.neighbourhood === selectedNeighborhood,
    );

  // update map view
  if (boundaries) {
    // reset choropleth layer style if active to remove previous neighborhood boundary highlight
    if (neighborhoodsLayer && neighborhoodsLayer._choropleth) {
      neighborhoodsLayer._choropleth.resetStyle();
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
    neighborhoodsLayer.addTo(map);

    // remove previous markers and add new ones with appropriate color scheme
    if (activeMarkerLayer) {
      map.removeLayer(activeMarkerLayer);
    }
    activeMarkerLayer = createMarkers(filteredListings, currentMarkerScheme);
    map.addLayer(activeMarkerLayer);

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
