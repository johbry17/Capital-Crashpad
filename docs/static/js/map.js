// Description: This file contains the functions to create the map and controls, and to handle user interactions

// global variables
let activeOverlay = null;
let activeLegend = null;
let baseLayer = null;

// map creation
function createMap(neighborhoods, listingsData, priceAvailabilityData) {
  const map = initializeMap();
  const markerGroups = initializeMarkerGroups(listingsData);
  const overlays = initializeOverlays(
    markerGroups,
    neighborhoods,
    listingsData
  );

  addBaseLayerControl(map);

  // initialize dropdown, neighborhood and choropleth layers
  neighborhoodsControl(map, neighborhoods, listingsData, priceAvailabilityData); // includes neighborhood layer
  const choroplethLayer = initializeChoroplethLayer(
    neighborhoods,
    listingsData
  );

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
    priceAvailabilityData,
    neighborhoods,
    choroplethLayer
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
        priceAvailabilityData,
        neighborhoods,
        choroplethLayer
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
    }
  );
  return L.map("map-id", {
    center: [38.89511, -77.03637],
    zoom: 12,
    layers: [baseLayer],
  });
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
function initializeOverlays(markerGroups, neighborhoods, listingsData) {
  return {
    "Airbnb's": markerGroups.default,
    "License Status": markerGroups.license,
    "Property Type": markerGroups.propertyType,
    "Median Price": initializeChoroplethLayer(neighborhoods, listingsData),
    "Total Airbnbs": initializeBubbleChartLayer(neighborhoods, listingsData),
  };
}

// add the base layers and control
function addBaseLayerControl(map) {
  let baseMap = {
    "Street Map": L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
  overlays,
  listingsData,
  priceAvailabilityData,
  neighborhoods,
  choroplethLayer
) {
  // remove all existing markers
  removeOverlays(map);

  // update overlays
  // choropleth layer
  if (selectedOverlayName === "Median Price") {
    activateOverlay(map, choroplethLayer);
    activeLegend = addLegend("Median Price").addTo(map);
    // bubble chart layer
  } else if (selectedOverlayName === "Total Airbnbs") {
    const bubbleLayer = initializeBubbleChartLayer(neighborhoods, listingsData);
    activateOverlay(map, bubbleLayer);
    activeLegend = null;
    // marker overlays
  } else {
    activateMarkerOverlay(
      map,
      selectedOverlayName,
      overlays,
      listingsData,
      selectedNeighborhood,
      priceAvailabilityData
    );
  }
}

// remove overlay from map
function removeOverlays(map) {
  if (activeOverlay) {
    map.removeLayer(activeOverlay);
  }
  if (activeLegend) {
    map.removeControl(activeLegend);
  }
}

// add overlay to map
function activateOverlay(map, overlay) {
  // remove all layers except base layer
  map.eachLayer((layer) => {
    if (layer !== baseLayer) {
      map.removeLayer(layer);
    }
  });
  // add overlay, toggle activeOverlay
  map.addLayer(overlay);
  activeOverlay = overlay;
}

// add marker overlay to map
function activateMarkerOverlay(
  map,
  selectedOverlayName,
  overlays,
  listingsData,
  selectedNeighborhood,
  priceAvailabilityData
) {
  const overlayState = updateOverlay(
    map,
    overlays[selectedOverlayName],
    selectedOverlayName,
    listingsData,
    selectedNeighborhood
  );
  activeOverlay = overlayState.activeOverlay;
  activeLegend = overlayState.activeLegend;
  // update plots and reset map view
  if (selectedNeighborhood === "top") {
    resetMapView(map, activeOverlay, listingsData, priceAvailabilityData);
  } else {
    zoomIn(
      map,
      activeOverlay,
      selectedNeighborhood,
      listingsData,
      priceAvailabilityData
    );
  }
}

// update the overlay
function updateOverlay(
  map,
  newOverlay,
  overlayName,
  listingsData,
  selectedNeighborhood
) {
  // remove previous overlay
  if (activeOverlay !== newOverlay) {
    removeOverlays(map);

    // filter listings by neighborhood
    const filteredListings = filterListingsByNeighborhood(
      listingsData,
      selectedNeighborhood
    );

    // set active overlay and legend
    let updatedMarkers;
    if (overlayName === "License Status") {
      updatedMarkers = createMarkers(filteredListings, "license");
      activeLegend = addLegend("License Status").addTo(map);
    } else if (overlayName === "Property Type") {
      updatedMarkers = createMarkers(filteredListings, "propertyType");
      activeLegend = addLegend("Property Type").addTo(map);
    } else {
      updatedMarkers = createMarkers(filteredListings);
      activeLegend = null;
    }

    // add new overlay
    map.addLayer(updatedMarkers);
    activeOverlay = updatedMarkers;
  }

  return { activeOverlay, activeLegend };
}

// create dropdown for neighborhood interaction
function neighborhoodsControl(
  map,
  neighborhoodsInfo,
  listingsData,
  priceAvailabilityData
) {
  const controlDiv = document.getElementById("neighborhoods-control");
  const dropdown = createNeighborhoodDropdown(neighborhoodsInfo);
  controlDiv.appendChild(dropdown);

  // create neighborhoods layer but don't add it to the map yet
  const neighborhoodsLayer = initializeNeighborhoodsLayer(
    map,
    neighborhoodsInfo,
    listingsData,
    priceAvailabilityData
  );

  // add event listener for dropdown changes
  addDropdownChangeListener(
    dropdown,
    map,
    neighborhoodsLayer,
    listingsData,
    priceAvailabilityData
  );
}

// create neighborhood dropdown elements
function createNeighborhoodDropdown(neighborhoodsInfo) {
  const dropdown = document.createElement("select");
  dropdown.id = "neighborhoods-dropdown";

  // sort neighborhoods alphabetically
  neighborhoodsInfo.features.sort((a, b) =>
    a.properties.neighbourhood.localeCompare(b.properties.neighbourhood)
  );

  // populate dropdown menu, DC first, then sorted neighborhoods
  const allDC = createOption("Washington, D.C.", "top");
  dropdown.appendChild(allDC);
  neighborhoodsInfo.features.forEach((feature) => {
    const option = createOption(
      feature.properties.neighbourhood,
      feature.properties.neighbourhood
    );
    option.setAttribute(
      "aria-label",
      `Neighborhood: ${feature.properties.neighbourhood}`
    );
    dropdown.appendChild(option);
  });

  return dropdown;
}

// event listener for dropdown changes
function addDropdownChangeListener(
  dropdown,
  map,
  neighborhoodsLayer,
  listingsData,
  priceAvailabilityData
) {
  dropdown.addEventListener("change", function () {
    const selectedNeighborhood = this.value;
    if (selectedNeighborhood === "top") {
      resetMapView(
        map,
        neighborhoodsLayer,
        listingsData,
        priceAvailabilityData
      );
    } else {
      zoomIn(
        map,
        neighborhoodsLayer,
        selectedNeighborhood,
        listingsData,
        priceAvailabilityData
      );
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

// get color scheme for markers when changing map view / zoom level
function getColorScheme() {
  if (activeLegend) {
    if (activeLegend._container.innerHTML.includes("License Status")) {
      return "license";
    } else if (activeLegend._container.innerHTML.includes("Property Type")) {
      return "propertyType";
    }
    // }
  }
  return null;
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
function resetMapView(
  map,
  neighborhoodsLayer,
  listingsData,
  priceAvailabilityData
) {
  map.setView([38.89511, -77.03637], 12);
  map.removeLayer(neighborhoodsLayer); // remove neighborhood boundaries from zoomIn()

  // update markers with appropriate color scheme, infoBox, and plots
  const colorScheme = getColorScheme();
  createMarkers(listingsData, colorScheme).addTo(map);
  updateInfoBox(listingsData, "Washington, D.C.");
  update31DaysInfoBox(listingsData, "Washington, D.C.");
  updateMultiListings(listingsData, "Washington, D.C.");
  allDCPlots(listingsData, priceAvailabilityData, defaultColors);

  // toggle median price button
  toggleButton("median-price-button", true);
  toggleButton("total-airbnbs-button", true);
}

// zooms map for neighborhood view, updates infoBox and plots
function zoomIn(
  map,
  neighborhoodsLayer,
  selectedNeighborhood,
  listingsData,
  priceAvailabilityData
) {
  // toggle buttons and choropleth Median Price legend
  toggleButton("total-airbnbs-button", false);
  toggleButton("median-price-button", false);
  if (
    activeLegend &&
    activeLegend._container.innerHTML.includes("Median Price")
  ) {
    activeLegend._container.style.display = "none";
  }

  // remove previous neighborhood boundaries (or they will remain uncovered)
  neighborhoodsLayer.resetStyle();

  // get neighborhood boundaries
  const boundaries = neighborhoodsLayer
    .getLayers()
    .find(
      (layer) => layer.feature.properties.neighbourhood === selectedNeighborhood
    );

  // update map view
  if (boundaries) {
    boundaries.setStyle({ weight: 3, color: "transparent" });
    map.fitBounds(boundaries.getBounds());

    // filter listings by neighbourhood
    const filteredListings = filterListingsByNeighborhood(
      listingsData,
      selectedNeighborhood
    );

    // clear markers
    map.eachLayer((layer) => {
      if (layer instanceof L.LayerGroup) {
        map.removeLayer(layer);
      }
    });

    // add layers
    neighborhoodsLayer.addTo(map);

    // add new markers
    const colorScheme = getColorScheme();
    createMarkers(filteredListings, colorScheme).addTo(map);

    // update infoBox, and plots
    updateInfoBox(listingsData, selectedNeighborhood);
    update31DaysInfoBox(listingsData, selectedNeighborhood);
    updateMultiListings(listingsData, selectedNeighborhood);
    neighborhoodPlots(
      listingsData,
      selectedNeighborhood,
      priceAvailabilityData,
      defaultColors
    );
  }
}
