// Description: This file contains the functions to create the map and controls, and to handle user interactions

// globals for tracking map state and active layers
const mapState = {
  map: null,

  markerScheme: "default",
  markerLayer: null,

  bubbleLayer: null,
  choroplethLayer: null,
  choroplethMetric: null,

  choroplethLegend: null,
  markerLegend: null,

  selectedNeighborhood: "top",
};

// default map view for resetting
const DC_VIEW = {
  center: [38.89511, -77.03637],
  zoom: 12,
};

//////////////////////////////////////////////////////////

// map creation
function createMap(neighborhoods, listingsData, statsByNeighborhood) {
  const map = initializeMap();
  mapState.map = map;

  addBaseLayerControl(map);

  // initialize dropdown and choropleth layer
  neighborhoodsControl(neighborhoods, listingsData, statsByNeighborhood);

  // event listeners for resizing
  window.addEventListener("resize", () => {
    map.invalidateSize();
    resizePlots();
  });

  // resize map to ensure it loads correctly
  map.invalidateSize();

  // set marker scheme to none initially
  mapState.markerScheme = "none";

  // set initial choropleth metric and add layer to map
  setChoroplethMetric("median_price");
  mapState.choroplethLayer.addTo(map);

  // event listener for overlay and marker scheme changes
  setupOverlayListeners(neighborhoods, listingsData, statsByNeighborhood);
}

//////////////////////////////////////////////////////////

// initialize the map
function initializeMap() {
  const baseLayer = L.tileLayer(
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
      map.setView(DC_VIEW.center, DC_VIEW.zoom); // reset to initial view
    });

    return button;
  };

  resetControl.addTo(map);
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

//////////////////////////////////////////////////////////

// create dropdown for neighborhood interaction
function neighborhoodsControl(
  neighborhoodsInfo,
  listingsData,
  statsByNeighborhood,
) {
  const controlDiv = document.getElementById("neighborhoods-control");
  const dropdown = createNeighborhoodDropdown(neighborhoodsInfo);
  controlDiv.appendChild(dropdown);

  // create neighborhoods layer but don't add it to the map yet
  mapState.choroplethLayer = initializeChoroplethLayer(
    neighborhoodsInfo,
    statsByNeighborhood,
  );

  // add event listener for dropdown changes
  dropdown.addEventListener("change", function () {
    // update selected neighborhood in mapState
    mapState.selectedNeighborhood = this.value;

    // update markers based on selected neighborhood and current marker scheme
    updateMarkers(mapState.selectedNeighborhood, listingsData);

    // change map view based on selected neighborhood
    if (mapState.selectedNeighborhood === "top") {
      resetMapView(mapState.map, listingsData, statsByNeighborhood);
    } else {
      zoomIn(
        mapState.map,
        mapState.selectedNeighborhood,
        listingsData,
        statsByNeighborhood,
      );
    }
  });
}

// create neighborhood dropdown elements
function createNeighborhoodDropdown(neighborhoodsInfo) {
  const dropdown = document.createElement("select");
  dropdown.id = "neighborhoods-dropdown";

  // sort neighborhoods alphabetically
  const sortedFeatures = [...neighborhoodsInfo.features].sort((a, b) =>
    a.properties.neighbourhood.localeCompare(b.properties.neighbourhood),
  );

  // populate dropdown menu, DC first, then sorted neighborhoods
  const allDC = createOption("Washington, D.C.", "top");
  dropdown.appendChild(allDC);
  sortedFeatures.forEach((feature) => {
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

// create dropdown options
function createOption(text, value) {
  const option = document.createElement("option");
  option.text = text;
  option.value = value;
  return option;
}

//////////////////////////////////////////////////////////

// setup event listeners for overlay and marker scheme changes
function setupOverlayListeners(
  neighborhoods,
  listingsData,
  statsByNeighborhood,
) {
  // event listener for overlay and marker scheme changes
  document
    .getElementById("choropleth-control")
    .addEventListener("click", handleOverlayClick);

  // event listener for marker scheme changes
  document
    .getElementById("marker-overlay-group")
    .addEventListener("change", handleMarkerChange);

  // toggle active class for marker scheme buttons
  // (only for visual feedback, doesn't affect functionality)
  const markerLabels = document.querySelectorAll("#marker-overlay-group label");
  document
    .querySelectorAll('#marker-overlay-group input[type="radio"]')
    .forEach((input) => {
      input.addEventListener("change", function () {
        markerLabels.forEach((label) => label.classList.remove("active"));
        this.parentElement.classList.add("active");
      });
    });

  // change overlay based on click
  function handleOverlayClick(e) {
    const selectedOverlay = e.target.getAttribute("data-overlay");
    // early exit if no overlay selected
    if (!selectedOverlay) return;

    // remove bubble layer if it exists
    if (mapState.bubbleLayer && mapState.map.hasLayer(mapState.bubbleLayer)) {
      mapState.map.removeLayer(mapState.bubbleLayer);
    }

    // toggle bubble layer for total Airbnbs
    if (selectedOverlay === "Total Airbnbs") {
      toggleBubbleLayer(neighborhoods, statsByNeighborhood);
      return;
    }

    // set choropleth metric
    if (selectedOverlay === "Median Price") {
      setChoroplethMetric("median_price");
      return;
    }
    // const metricMap = {
    //   "License Compliance": "license_compliance",
    //   "Median Price": "median_price",
    //   "Reviews per Month": "reviews_per_month",
    //   "% Multi-Listing Hosts": "multi_listing_pct",
    //   "Listings per 1,000": "listings_per_1000",
    // };

    // const metric = metricMap[selectedOverlay];
    // if (metric) {
    //   setChoroplethMetric(metric);
    // }
  }

  // handle marker scheme changes
  function handleMarkerChange(e) {
    const scheme = e.target.getAttribute("data-overlay");
    // do nothing if the same scheme is selected
    if (!scheme) return;
    // update marker scheme in mapState
    mapState.markerScheme =
      scheme === "None"
        ? "none"
        : scheme === "Airbnb's"
          ? "default"
          : scheme === "License Status"
            ? "license"
            : scheme === "Property Type"
              ? "propertyType"
              : "none";
    // update markers based on selected neighborhood and new scheme
    updateMarkers(mapState.selectedNeighborhood, listingsData);
  }
}

// set choropleth metric and update layer style and legend
function setChoroplethMetric(metric) {
  mapState.choroplethMetric = metric;
  mapState.choroplethLayer.setStyle(mapState.choroplethLayer.options.style);
  updateChoroplethLegend();
}

// update choropleth legend based on current metric
function updateChoroplethLegend() {
  // remove any existing choropleth legend
  if (mapState.choroplethLegend) {
    mapState.map.removeControl(mapState.choroplethLegend);
    mapState.choroplethLegend = null;
  }

  // safety check
  if (!mapState.choroplethMetric) return;

  // get config for current metric and add new legend
  const config = choroplethConfig[mapState.choroplethMetric];
  mapState.choroplethLegend = addLegend(config.label).addTo(mapState.map);
}

// toggle bubble layer on/off
function toggleBubbleLayer(neighborhoods, statsByNeighborhood) {
  // initialize bubble layer if it doesn't exist yet (first time toggling on)
  if (!mapState.bubbleLayer) {
    mapState.bubbleLayer = initializeBubbleChartLayer(
      neighborhoods,
      statsByNeighborhood,
    );
  }

  // show bubble layer if not present
  if (!mapState.map.hasLayer(mapState.bubbleLayer)) {
    mapState.map.addLayer(mapState.bubbleLayer);
  }

  // remove marker layer if present
  if (mapState.markerLayer) {
    mapState.map.removeLayer(mapState.markerLayer);
    mapState.markerLayer = null;
  }
  // Remove marker legend if present
  if (mapState.markerLegend) {
    mapState.map.removeControl(mapState.markerLegend);
    mapState.markerLegend = null;
  }
  // reset marker radio button to "None" and update button state
  // const markerNone = document.getElementById("marker-none");
  // if (markerNone) markerNone.checked = true;
  const markerLabels = document.querySelectorAll("#marker-overlay-group label");
  markerLabels.forEach((label) => label.classList.remove("active"));
  // set the first label (None) to active (hacky, but it works)
  let noneLabel = markerLabels[0];
  if (noneLabel) noneLabel.classList.add("active");
  // set marker scheme to none
  mapState.markerScheme = "none";

  // set choropleth to null (default borders, no fill) and update legend
  setChoroplethMetric(null);
  updateChoroplethLegend();
}

// update markers based on selected neighborhood and marker scheme
function updateMarkers(selectedNeighborhood, listingsData) {
  // remove bubble layer if it exists
  if (mapState.bubbleLayer && mapState.map.hasLayer(mapState.bubbleLayer)) {
    mapState.map.removeLayer(mapState.bubbleLayer);
  }

  // remove existing marker layer if it exists
  if (mapState.markerLayer) {
    mapState.map.removeLayer(mapState.markerLayer);
    mapState.markerLayer = null;
  }

  // early exit if marker scheme is "none"
  if (mapState.markerScheme === "none") return;

  // filter listings by neighborhood
  const filtered = filterListingsByNeighborhood(
    listingsData,
    selectedNeighborhood,
  );

  // create new marker layer based on selected scheme
  mapState.markerLayer = createMarkers(filtered, mapState.markerScheme);

  // add new marker layer to map
  mapState.map.addLayer(mapState.markerLayer);

  // add legend if applicable
  updateMarkerLegend();
}

// update legend based on marker scheme
function updateMarkerLegend() {
  if (mapState.markerLegend) {
    mapState.map.removeControl(mapState.markerLegend);
    mapState.markerLegend = null;
  }

  if (mapState.markerScheme === "license") {
    mapState.markerLegend = addLegend("License Status").addTo(mapState.map);
  }

  if (mapState.markerScheme === "propertyType") {
    mapState.markerLegend = addLegend("Property Type").addTo(mapState.map);
  }
}

//////////////////////////////////////////////////////////

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
  map.setView(DC_VIEW.center, DC_VIEW.zoom);
  // reset choropleth style (neighborhoods may remain uncovered otherwise)
  if (mapState.choroplethLayer) {
    mapState.choroplethLayer.resetStyle();
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
  // toggle button
  toggleButton("total-airbnbs-button", false);

  // reset choropleth boundaries (or they will remain uncovered)
  if (mapState.choroplethLayer) {
    mapState.choroplethLayer.resetStyle();
  }

  // get neighborhood boundaries
  const boundaries = mapState.choroplethLayer
    .getLayers()
    .find(
      (layer) =>
        layer.feature.properties.neighbourhood === selectedNeighborhood,
    );

  // update map view
  if (boundaries) {
    // set style for selected neighborhood
    boundaries.setStyle({
      weight: 3,
      color: "transparent",
      fillOpacity: 0,
      opacity: 0,
    });

    // zoom to neighborhood boundaries
    map.fitBounds(boundaries.getBounds());

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
