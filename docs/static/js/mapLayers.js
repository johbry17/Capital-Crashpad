// Description: Functions to create and initialize map layers - neighborhoods, choropleth, bubble chart, and markers

// initialize neighborhoods layer and zoomIn function to neighborhoods
function initializeNeighborhoodsLayer(
  map,
  neighborhoods,
  listingsData,
  priceAvailabilityData
) {
  const neighborhoodsLayer = L.geoJSON(neighborhoods, {
    style: {
      color: defaultColors.neighborhoodLayer,
      weight: 3,
    },
    // update dropdown and zoom in on neighborhood
    onEachFeature: (feature, layer) => {
      layer.on("click", function () {
        const selectedNeighborhood = feature.properties.neighbourhood;
        document.getElementById("neighborhoods-dropdown").value =
          selectedNeighborhood;
        zoomIn(
          map,
          neighborhoodsLayer,
          selectedNeighborhood,
          listingsData,
          priceAvailabilityData
        );
      });
    },
  });

  // return the layer without adding it to the map
  return neighborhoodsLayer;
}

// create choropleth layer for neighborhood boundaries
function initializeChoroplethLayer(neighborhoods, listingsData) {
  const medianPrices = calculateMedianPricePerNeighborhood(listingsData);
  const neighborhoodCounts = calculateAirbnbCountsPerNeighborhood(listingsData);
  const getColor = (price) =>
    d3.scaleSequential(d3.interpolateViridis).domain([50, 250])(price);

  // to hold the choropleth and text markers
  const layerGroup = L.layerGroup();

  // layer for the choropleth polygons
  const choroplethLayer = L.geoJSON(neighborhoods, {
    style: (feature) => ({
      fillColor: getColor(medianPrices[feature.properties.neighbourhood] || 0),
      weight: 2,
      opacity: 1,
      color: "white",
      dashArray: "3",
      fillOpacity: 1,
    }),
    onEachFeature: setChoroplethFeatures(
      medianPrices,
      neighborhoodCounts,
      layerGroup
    ),
  });

  // add choropleth to layer
  layerGroup.addLayer(choroplethLayer);

  return layerGroup;
}

// create features for choropleth layer - popups, text markers
function setChoroplethFeatures(medianPrices, neighborhoodCounts, layerGroup) {
  return (feature, layer) => {
    const neighborhood = feature.properties.neighbourhood;
    const avgPrice = medianPrices[neighborhood] || "No Data";
    const count = neighborhoodCounts[neighborhood] || 0;
    const popupContent = `${neighborhood}<br>
    <span class="popup-text-right popup-text-right-larger"><b>Median Price: $${avgPrice
      .toFixed(2)
      .toLocaleString()}</b></span>
    <span class="popup-text-right">Airbnb Count: ${count.toLocaleString()}</span>`;

    // bind popup to layer
    layer.bindPopup(popupContent, { className: "marker-popup" });

    // open || close popup
    popupMouseEvents(layer);

    // calculate centroid for placing text markers
    const latlng = calculateCentroid(feature);

    // add create text marker and add to layer
    const textMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: "choropleth-label",
        html: `<div>$${avgPrice.toFixed(0).toLocaleString()}</div>`,
        iconSize: [100, 50],
        iconAnchor: [50, 25], // anchor point of the text box
      }),
      interactive: false,
    });

    layerGroup.addLayer(textMarker);
  };
}

// calculates centroid for choropleth and bubble chart layers
function calculateCentroid(feature) {
  const centroid = turf.centroid(feature);
  return [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
}

// handle popup events
function popupMouseEvents(layer) {
  let popupOpen = false; // tracks popup state

  layer.on({
    mouseover() {
      if (!popupOpen) this.openPopup();
    },
    mouseout() {
      if (!popupOpen) this.closePopup();
    },
    click() {
      popupOpen ? this.closePopup() : this.openPopup();
      popupOpen = !popupOpen;
    },
  });
}

// create bubble chart layer, - neighoborhood outlines and bubbles of count of airbnbs
function initializeBubbleChartLayer(neighborhoods, listingsData) {
  const bubbleLayerGroup = L.layerGroup(); // create layer group for circle markers
  initializeNeighborhoodOutlines(bubbleLayerGroup, neighborhoods);
  addBubbles(bubbleLayerGroup, neighborhoods, listingsData);
  return bubbleLayerGroup;
}

// create neighborhood outlines layer
function initializeNeighborhoodOutlines(bubbleLayerGroup, neighborhoods) {
  const neighborhoodsLayer = L.geoJSON(neighborhoods, {
    style: {
      color: defaultColors.defaultGray,
      weight: 2,
      opacity: 1,
      fillOpacity: 0, // no fill, just outlines
    },
  });
  bubbleLayerGroup.addLayer(neighborhoodsLayer);
}

// create bubbles, text markers, and popups for each neighborhood
function addBubbles(bubbleLayerGroup, neighborhoods, listingsData) {
  // process data
  const medianPrices = calculateMedianPricePerNeighborhood(listingsData);
  const neighborhoodData = calculateAirbnbCountsPerNeighborhood(listingsData);

  // loop through neighborhoods and create bubbles
  neighborhoods.features.forEach((feature) => {
    const neighborhood = feature.properties.neighbourhood;
    const avgPrice = medianPrices[neighborhood] || 0;
    const count = neighborhoodData[neighborhood] || 0;
    const radius = Math.sqrt(count) * 2; // scale radius based on count
    const latlng = calculateCentroid(feature); // for placing markers

    // create circle marker at centroid
    const circleMarker = L.circleMarker(latlng, {
      radius: radius,
      fillColor: defaultColors.neighborhoodColor,
      color: defaultColors.defaultGray,
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    }).bindPopup(
      `${neighborhood}<br>
        <span class="popup-text-right">Median Price: $${avgPrice
          .toFixed(2)
          .toLocaleString()}</span>
        <span class="popup-text-right popup-text-right-larger"><b>Airbnb Count: ${count.toLocaleString()}</b></span>`,
      { className: "marker-popup" }
    );

    // create marker with text inside and add to layer
    const textMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: "bubble-text",
        html: `<div>${count.toLocaleString()}</div>`,
        iconSize: [radius * 2, radius * 2], // match size of circle marker
        iconAnchor: [radius, radius], // center text
      }),
      interactive: false,
    });

    // open || close popup
    popupMouseEvents(circleMarker);

    // add markers to layer group
    bubbleLayerGroup.addLayer(circleMarker).addLayer(textMarker);
  });
}

// create legend
function addLegend(type) {
  let legend = L.control({ position: "topright" });

  legend.onAdd = function () {
    let div = L.DomUtil.create("div", "custom-legend");
    div.style.zIndex = "1000"; // ensure legend is on top

    // set labels and colors based on type
    let labels = [],
      colors = [];
    switch (type) {
      case "License Status":
        labels = ["Licensed", "Exempt", "No License"];
        colors = labels.map(
          (label) => licenseColors[label] || licenseColors.default
        );
        div.innerHTML = '<div class="legend-title">License Status</div>';
        break;
      case "Property Type":
        labels = [
          "Entire home/apt",
          "Private room",
          "Shared room",
          "Hotel room",
        ];
        colors = labels.map(
          (label) => propertyTypeColors[label] || propertyTypeColors.default
        );
        div.innerHTML = '<div class="legend-title">Property Type</div>';
        break;
      case "Median Price":
        div.innerHTML = '<div class="legend-title">Median Price</div>';
        const gradientBar = createGradientBar();
        div.appendChild(gradientBar);
        div.appendChild(createPriceLabels());
        return div;
    }

    // Append the legend colors and labels
    labels.forEach((label, index) => {
      div.innerHTML += `<div><i class="legend-color" style="background:${colors[index]}"></i>${label}</div>`;
    });

    return div;
  };

  return legend;
}

// create gradient bar for choropleth legend
function createGradientBar() {
  const gradientBar = document.createElement("div");
  gradientBar.style.width = "100%";
  gradientBar.style.height = "20px";
  gradientBar.style.background = `linear-gradient(to right, ${Array.from(
    { length: 101 },
    (_, i) =>
      d3.scaleSequential(d3.interpolateViridis).domain([50, 300])(50 + i * 2.5)
  ).join(", ")})`;
  return gradientBar;
}

// create labels for choropleth legend price range
function createPriceLabels() {
  const labelContainer = document.createElement("div");
  labelContainer.style.display = "flex";
  labelContainer.style.justifyContent = "space-between";
  labelContainer.innerHTML = `<div>$50</div><div>$300</div>`;
  return labelContainer;
}

// // initialize markers with custom color options based on a property
// function createMarkers(data, colorScheme = null) {
//   // process data for license status
//   data = setLicenseStatus(data);

//   // empty marker layer
//   const markers = L.layerGroup();

//   // loop to populate markers
//   data.forEach((listing) => {
//     let markerColor = defaultColors.airbnbs; // default color

//     // determine marker color based on colorScheme parameter
//     if (colorScheme === "license") {
//       markerColor =
//         licenseColors[listing.licenseCategory] || licenseColors.default;
//     } else if (colorScheme === "propertyType") {
//       markerColor =
//         propertyTypeColors[listing.room_type] || propertyTypeColors.default;
//     }

//     // marker design
//     const markerOptions = {
//       radius: 3,
//       fillColor: markerColor,
//       color: "black",
//       weight: 1,
//       fillOpacity: 1,
//       interactive: true,
//     };

//     const marker = L.circleMarker(
//       [listing.latitude, listing.longitude],
//       markerOptions
//     );
//     marker.bindPopup(createPopupContent(listing), {
//       className: "marker-popup",
//     });

//     // open || close popup
//     popupMouseEvents(marker);

//     // bring marker to front on hover
//     marker.bringToFront();

//     markers.addLayer(marker);
//   });

//   return markers;
// }

// // populate popups
// function createPopupContent(listing) {
//   const price = parseFloat(listing.price).toLocaleString("en-US", {
//     style: "currency",
//     currency: "USD",
//   });
//   const hostVerified =
//     listing.host_identity_verified === "True" ? "Verified" : "Unverified";
//   const hoverDescription = listing.hover_description
//     ? `<h4><b>${listing.hover_description}</b></h4>`
//     : "<h4><b>Description not available</b></h4>";
//   const rating = listing.review_scores_rating
//     ? `${listing.review_scores_rating} \u2605`
//     : "No rating yet";
//   const license = listing.license
//     ? listing.license.split(":")[0].trim()
//     : "No License";

//   return `
//       ${hoverDescription}
//       <a href="${listing.listing_url}" target="_blank">Link to listing</a><br>
//       <b>Price:</b> ${price}<br>
//       <b>Property Type:</b> ${listing.room_type}<br>
//       <b>Property Subtype:</b> ${listing.property_type}<br>
//       <b>Accommodates:</b> ${listing.accommodates}<br>
//       <b>Rating:</b> ${rating}<br>
//       <b>Host:</b> ${listing.host_name}<br>
//       <b>Host Verified:</b> ${hostVerified}<br>
//       <b>Host Total Airbnbs:</b> ${listing.host_listings_count}<br>
//       <b>License:</b> ${license}<br>
//     `;
// }

// create markers grouped by lat/long, optional color by license status or property type
function createMarkers(data, colorScheme = null) {
  // get license status for each listing
  data = setLicenseStatus(data);

  // empty marker layer
  const markers = L.layerGroup();

  // group listings by coordinates
  const grouped = groupListingsByLatLon(data);

  // loop to populate markers
  Object.values(grouped).forEach((listingsAtLocation) => {
    const { latitude, longitude } = listingsAtLocation[0];

    // if applicable, assign color based on colorScheme
    let markerColor = defaultColors.airbnbs; // default color
    if (colorScheme === "license") {
      markerColor =
        licenseColors[listingsAtLocation[0].licenseCategory] ||
        licenseColors.default;
    } else if (colorScheme === "propertyType") {
      markerColor =
        propertyTypeColors[listingsAtLocation[0].room_type] ||
        propertyTypeColors.default;
    }

    // marker design
    const markerOptions = {
      radius: 3,
      fillColor: markerColor,
      color: "black",
      weight: 1,
      fillOpacity: 1,
      interactive: true,
    };

    // create marker
    const marker = L.circleMarker([latitude, longitude], markerOptions);

    // bind popup to marker
    marker.bindPopup(createPopupContentForGroup(listingsAtLocation, markerColor), {
      className: "marker-popup",
      maxWidth: 400,
    });

    // open || close popup, bring to front on hover
    popupMouseEvents(marker);
    marker.bringToFront();

    // add marker to layerGroup
    markers.addLayer(marker);
  });

  return markers;
}

// group listings by lat/lon for multiple listings at same location
function groupListingsByLatLon(data) {
  const grouped = {};
  data.forEach((listing) => {
    const key = `${listing.latitude},${listing.longitude}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(listing);
  });
  return grouped;
}

// populate popups for multiple listings
function createPopupContentForGroup(listings, markerColor = "#333") {
  const content = listings
    .map((listing) => {
      const price = parseFloat(listing.price).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
      const hostVerified =
        listing.host_identity_verified === "True" ? "Verified" : "Unverified";
      const hoverDescription = listing.hover_description
        ? `<h4><b>${listing.hover_description}</b></h4>`
        : "<h4><b>Description not available</b></h4>";
      const rating = listing.review_scores_rating
        ? `${listing.review_scores_rating} \u2605`
        : "No rating yet";
      const license = listing.license
        ? listing.license.split(":")[0].trim()
        : "No License";

      return `
      ${hoverDescription}
      <a href="${listing.listing_url}" target="_blank">Link to listing</a><br>
      <b>Price:</b> ${price}<br>
      <b>Property Type:</b> ${listing.room_type}<br>
      <b>Property Subtype:</b> ${listing.property_type}<br>
      <b>Accommodates:</b> ${listing.accommodates}<br>
      <b>Rating:</b> ${rating}<br>
      <b>Host:</b> ${listing.host_name}<br>
      <b>Host Verified:</b> ${hostVerified}<br>
      <b>Host Total Airbnbs:</b> ${listing.host_listings_count}<br>
      <b>License:</b> ${license}<br>
    `;
    })
    .join("<hr>");

  // wrap in scrollable container
  return `<div style="max-height:300px;overflow-y:auto; border: 4px solid ${markerColor}; border-radius: 10px; padding: 16px;">${content}</div>`;
}
