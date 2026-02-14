// Description: This file contains the functions to create the map and controls, and to handle user interactions

// globals for tracking map state and active layers
const mapState = {
  map: null,
  selectedNeighborhood: "top",

  markerScheme: "default",
  markerLayer: null,

  bubbleLayer: null,
  choroplethLayer: null,
  choroplethLabels: null,
  choroplethMetric: null,
  isRelative: false,

  choroplethLegend: null,
  markerLegend: null,
};

// default map view for resetting
const DC_VIEW = {
  center: [38.89511, -77.03637],
  zoom: 12,
};

//////////////////////////////////////////////////////////

// map creation
function createMap() {
  mapState.map = initializeMap();

  addBaseLayerControl();

  // initialize dropdown and choropleth layer
  neighborhoodsControl();

  // event listeners for resizing
  window.addEventListener("resize", () => {
    mapState.map.invalidateSize();
    // resizePlots();
  });

  // resize map to ensure it loads correctly
  mapState.map.invalidateSize();

  // set marker scheme to none initially
  mapState.markerScheme = "none";

  // set initial choropleth metric and add layer to map
  setChoroplethMetric("license_compliance");
  mapState.choroplethLayer.addTo(mapState.map);

  // setup UI control event listeners
  initializeUIControls();

  // update infoBox and plots for initial view
  // updateInfoBox(listingsData, "Washington, D.C.");
  // update31DaysInfoBox(listingsData, "Washington, D.C.");
  // updateMultiListings(listingsData, "Washington, D.C.");
  // allDCPlots(listingsData, statsByNeighborhood, defaultColors);
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
  mapState.map = L.map("map-id", {
    center: [38.89511, -77.03637],
    zoom: 12,
    layers: [baseLayer],
  });
  addResetButton();
  return mapState.map;
}

// add reset button to map
function addResetButton() {
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
      mapState.map.setView(DC_VIEW.center, DC_VIEW.zoom); // reset to initial view
    });

    return button;
  };

  resetControl.addTo(mapState.map);
}

// add the base layers and control
function addBaseLayerControl() {
  let baseMap = {
    "Street Map": L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ),
    Satellite: L.esri.basemapLayer("Imagery"),
    "National Geographic": L.esri.basemapLayer("NationalGeographic"),
    Topographic: L.esri.basemapLayer("Topographic"),
    Grayscale: L.esri.basemapLayer("Gray"),
  };
  L.control.layers(baseMap, null).addTo(mapState.map);
}

//////////////////////////////////////////////////////////

// create dropdown for neighborhood interaction
function neighborhoodsControl() {
  const controlDiv = document.getElementById("neighborhoods-control");
  const dropdown = createNeighborhoodDropdown();
  controlDiv.appendChild(dropdown);

  // create neighborhoods layer but don't add it to the map yet
  mapState.choroplethLayer = initializeChoroplethLayer();

  // add event listener for dropdown changes
  dropdown.addEventListener("change", function () {
    // update selected neighborhood in mapState
    mapState.selectedNeighborhood = this.value;

    // update markers based on selected neighborhood and current marker scheme
    updateMarkers();

    // change map view based on selected neighborhood
    if (mapState.selectedNeighborhood === "top") {
      resetMapView();
    } else {
      zoomIn();
    }
  });
}

// create neighborhood dropdown elements
function createNeighborhoodDropdown() {
  const dropdown = document.createElement("select");
  dropdown.id = "neighborhoods-dropdown";

  // sort neighborhoods alphabetically
  const sortedFeatures = [...neighborhoods.features].sort((a, b) =>
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

// setup event listeners for UI controls
function initializeUIControls() {
  wireChoroplethButtons();
  wireRelativeToggle();
  wireMarkerControls();
  wireResponsiveControlMove();
}

// setup event listeners for choropleth overlay buttons and toggle active class for buttons
function wireChoroplethButtons() {
  const container = document.getElementById("choropleth-control");
  const buttons = container.querySelectorAll("button");

  // set initial active button on load
  document.getElementById("license-compliance-button")?.classList.add("active");

  // event listener for choropleth changes
  container.addEventListener("click", (e) => {
    const selectedOverlay = e.target.getAttribute("data-overlay");
    if (!selectedOverlay) return;

    // visual active state
    buttons.forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");

    // update map based on selected overlay
    handleOverlaySelection(selectedOverlay);
  });
}

// event listener for toggle slider changes and styling of toggle labels
function wireRelativeToggle() {
  const toggle = document.getElementById("toggle-relative");

  // set initial state of toggle labels
  updateToggleLabels();

  // event listener for toggle changes
  toggle.addEventListener("change", (e) => {
    mapState.isRelative = e.target.checked;
    updateToggleLabels();

    // update choropleth metric to trigger style and legend updates
    if (mapState.choroplethMetric) {
      setChoroplethMetric(mapState.choroplethMetric);
    }
  });
}

// setup event listener for marker scheme changes and toggle active class for buttons
function wireMarkerControls() {
  const container = document.getElementById("marker-overlay-group");
  const labels = container.querySelectorAll("label");

  // event listener for marker scheme changes
  container.addEventListener("change", (e) => {
    const scheme = e.target.getAttribute("data-overlay");
    if (!scheme) return;

    // toggle active class for ui visual feedback
    labels.forEach((l) => l.classList.remove("active"));
    e.target.parentElement.classList.add("active");

    // update marker scheme in mapState and refresh markers
    mapState.markerScheme = resolveMarkerScheme(scheme);
    updateMarkers();
  });
}

// move control on load and on resize for mobile responsiveness
function wireResponsiveControlMove() {
  moveChoroplethControl();
  window.addEventListener("resize", moveChoroplethControl);
}

// style toggle slider labels based on state
function updateToggleLabels() {
  const toggle = document.getElementById("toggle-relative");
  const absoluteLabel = document.querySelector(".absolute-label");
  if (toggle.checked) {
    absoluteLabel.classList.remove("active");
  } else {
    absoluteLabel.classList.add("active");
  }
}

// toggle to move choropleth control for mobile responsiveness
function moveChoroplethControl() {
  const control = document.getElementById("choropleth-control");
  const mapContainer = document.querySelector(".map-container");
  const parentRow = document.querySelector(".row");

  if (window.innerWidth <= 600) {
    // move below map
    if (parentRow && control && control.parentNode !== parentRow) {
      parentRow.appendChild(control);
    }
  } else {
    // move inside map
    if (mapContainer && control && control.parentNode !== mapContainer) {
      mapContainer.appendChild(control);
    }
  }
}

/////////////////////////////////////////////////////////////

// change map overlay based on selected option
function handleOverlaySelection(selectedOverlay) {
  // early exit if no overlay selected
  if (!selectedOverlay) return;

  // add bubble layer and exit if selected
  if (selectedOverlay === "Total Airbnbs") {
    toggleBubbleLayer();
    return;
  }

  // map overlay names to metric keys for easier handling
  const metricMap = {
    "License Compliance": "license_compliance",
    "Median Price": "median_price",
    "Reviews per Month": "reviews_per_month",
    "% Multi-Property Hosts": "multi_listing_pct",
    "Listings per 1,000 Residents": "listings_per_1000",
    "Total Listings": "total_listings",
  };

  // set choropleth metric to trigger style and legend updates
  const metric = metricMap[selectedOverlay];
  if (metric) {
    removeBubbleLayerIfPresent();
    setChoroplethMetric(metric);
  }
}

// utility function to remove bubble layer if it exists
function removeBubbleLayerIfPresent() {
  if (mapState.bubbleLayer && mapState.map.hasLayer(mapState.bubbleLayer)) {
    mapState.map.removeLayer(mapState.bubbleLayer);
  }
}

// set choropleth metric and update layer style and legend
function setChoroplethMetric(metric) {
  // store selected metric in mapState
  mapState.choroplethMetric = metric;

  // resolve metric key based on relative mode
  const resolved = resolveMetric(metric);

  // update choropleth layer style
  mapState.choroplethLayer.options.metric = resolved;
  mapState.choroplethLayer.setStyle(mapState.choroplethLayer.options.style);
  updateChoroplethLabels();
  updateChoroplethLegend();
}

// resolve metric key based on whether relative mode is toggled
function resolveMetric(baseMetric) {
  // safety check
  if (!baseMetric) return null;

  // return base metric if not in relative mode
  if (!mapState.isRelative) return baseMetric;

  // mapping of base metrics to their relative counterparts
  const relativeMap = {
    license_compliance: "license_compliance_vs_dc_pct",
    median_price: "median_price_vs_dc_pct",
    reviews_per_month: "reviews_per_month_vs_dc_pct",
    multi_listing_pct: "multi_listing_pct_vs_dc_pct",
    listings_per_1000: "listings_per_1000_vs_dc_pct",
    total_listings: "total_listings_vs_dc_pct",
  };

  // return relative metric if available, else return base metric
  return relativeMap[baseMetric] || baseMetric;
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

  // add new legend
  mapState.choroplethLegend = addLegend("choropleth").addTo(mapState.map);
}

// toggle bubble layer on/off
function toggleBubbleLayer() {
  // initialize bubble layer if it doesn't exist yet (first time toggling on)
  if (!mapState.bubbleLayer) {
    mapState.bubbleLayer = initializeBubbleChartLayer();
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

// resolve marker scheme based on selected option
function resolveMarkerScheme(label) {
  if (label === "None") return "none";
  if (label === "Airbnb's") return "default";
  if (label === "License Status") return "license";
  if (label === "Property Type") return "propertyType";
  return "none";
}

// update markers based on selected neighborhood and marker scheme
function updateMarkers() {
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
  const filtered = filterListingsByNeighborhood();

  // create new marker layer based on selected scheme
  mapState.markerLayer = createMarkers(filtered);

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
function resetMapView() {
  // center map on D.C. and reset zoom
  mapState.map.setView(DC_VIEW.center, DC_VIEW.zoom);
  // reset choropleth style (neighborhoods may remain uncovered otherwise)
  if (mapState.choroplethLayer) {
    mapState.choroplethLayer.resetStyle();
  }

  // update infoBox and plots
  // updateInfoBox(listingsData, "Washington, D.C.");
  // update31DaysInfoBox(listingsData, "Washington, D.C.");
  // updateMultiListings(listingsData, "Washington, D.C.");
  // allDCPlots(listingsData, statsByNeighborhood, defaultColors);

  // toggle button
  toggleButton("total-airbnbs-button", true);
}

// zooms map for neighborhood view, updates infoBox and plots
function zoomIn() {
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
        layer.feature.properties.neighbourhood ===
        mapState.selectedNeighborhood,
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
    mapState.map.fitBounds(boundaries.getBounds());

    // update infoBox, and plots
    // updateInfoBox(listingsData, selectedNeighborhood);
    // update31DaysInfoBox(listingsData, selectedNeighborhood);
    // updateMultiListings(listingsData, selectedNeighborhood);
    // neighborhoodPlots(
    //   listingsData,
    //   selectedNeighborhood,
    //   statsByNeighborhood,
    //   defaultColors,
    // );
  }
}
