// Description: Functions to create and initialize map layers - neighborhoods, choropleth, bubble chart, and markers

// get color for choropleth based on metric and value
function getColorForMetric(metric, value) {
  return choroplethConfig[metric].scale(value);
}

// initialize choropleth layer and zoomIn function to neighborhoods
function initializeChoroplethLayer(neighborhoods, statsByNeighborhood) {
  const choroplethLayer = L.geoJSON(neighborhoods, {
    style: (feature) => {
      // if no metric selected, show default gray with no fill
      if (mapState.choroplethMetric == null) {
        return {
          color: defaultColors.defaultGray,
          weight: 2,
          fillOpacity: 0,
        };
      }

      // get metric value for neighborhood to determine fill color
      const metric = mapState.choroplethMetric;
      const value =
        statsByNeighborhood[feature.properties.neighbourhood]?.[metric] || 0;

      return {
        fillColor: getColorForMetric(metric, value),
        weight: 2,
        color: "white",
        fillOpacity: 0.6,
      };
    },
    // on click, update dropdown to zoom in on neighborhood
    onEachFeature: (feature, layer) => {
      layer.on("click", function () {
        const selectedNeighborhood = feature.properties.neighbourhood;
        const dropdown = document.getElementById("neighborhoods-dropdown");
        dropdown.value = selectedNeighborhood;
        dropdown.dispatchEvent(new Event("change"));
      });
    },
  });

  // return the layer without adding it to the map
  return choroplethLayer;
}

// create choropleth labels layer with metric values for each neighborhood
function updateChoroplethLabels(neighborhoods, statsByNeighborhood) {
  const map = mapState.map;
  const metric = mapState.choroplethMetric;

  // remove old layer if it exists
  if (mapState.choroplethLabels) {
    map.removeLayer(mapState.choroplethLabels);
  }

  // create new label layer
  const labelGroup = L.layerGroup();

  // loop through neighborhoods to create labels
  neighborhoods.features.forEach((feature) => {
    // get neighborhood name and centroid for label placement
    const neighborhood = feature.properties.neighbourhood;
    const latlng = calculateCentroid(feature);

    let labelHTML = "";

    // if a metric is selected, get the value for this neighborhood and format it for the label
    if (metric) {
      const value = statsByNeighborhood[neighborhood]?.[metric];
      const formatted = formatMetric(metric, value);
      labelHTML = `<div>${formatted}</div>`;
    }

    // create marker with label HTML and add to label layer group
    const label = L.marker(latlng, {
      icon: L.divIcon({
        className: "choropleth-label",
        html: labelHTML,
        iconSize: [100, 24],
        iconAnchor: [50, 12],
      }),
      interactive: false,
    });

    labelGroup.addLayer(label);
  });

  // add label layer to map and save reference in mapState for future updates
  mapState.choroplethLabels = labelGroup;
  map.addLayer(labelGroup);
}

// helper function to format metric values for labels
function formatMetric(metric, value) {
  if (!metric || value == null || isNaN(value)) return "";

  switch (metric) {
    case "license_compliance":
      return `${Math.round(value * 100)}%`;

    case "median_price":
      return `$${Math.round(value)}`;

    case "reviews_per_month":
      return Number(value).toFixed(1);

    case "multi_listing_pct":
      return `${Math.round(value * 100)}%`;

    case "listings_per_1000":
      return Number(value).toFixed(1);

    case "total_listings":
      return `${Math.round(value)}`;

    default:
      return value;
  }
}

//////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////

// create bubble chart layer, - neighoborhood outlines and bubbles of count of airbnbs
function initializeBubbleChartLayer(neighborhoods, statsByNeighborhood) {
  const bubbleLayerGroup = L.layerGroup(); // create layer group for circle markers
  initializeNeighborhoodOutlines(bubbleLayerGroup, neighborhoods);
  addBubbles(bubbleLayerGroup, neighborhoods, statsByNeighborhood);
  return bubbleLayerGroup;
}

// create neighborhood outlines layer
function initializeNeighborhoodOutlines(bubbleLayerGroup, neighborhoods) {
  const neighborhoodsOutlineLayer = L.geoJSON(neighborhoods, {
    style: {
      color: defaultColors.defaultGray,
      weight: 2,
      opacity: 1,
      fillOpacity: 0, // no fill, just outlines
    },
  });
  bubbleLayerGroup.addLayer(neighborhoodsOutlineLayer);
}

// create bubbles, text markers, and popups for each neighborhood
function addBubbles(bubbleLayerGroup, neighborhoods, statsByNeighborhood) {
  // loop through neighborhoods and create bubbles
  neighborhoods.features.forEach((feature) => {
    // get neighborhood stats for bubble size and popup content
    const neighborhood = feature.properties.neighbourhood;
    const avgPrice = +statsByNeighborhood[neighborhood]?.median_price || 0;
    const count = +statsByNeighborhood[neighborhood]?.total_listings || 0;
    const radius = Math.sqrt(count) * 2; // scale radius based on count
    const latlng = calculateCentroid(feature); // for placing markers

    // create circle marker at centroid, bind popup
    const circleMarker = L.circleMarker(latlng, {
      radius: radius,
      fillColor: defaultColors.neighborhoodColor,
      color: defaultColors.defaultGray,
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    }).bindPopup(
      `${neighborhood}<br>
        <span class="popup-text-right">Median Price: ${avgPrice.toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>
        <span class="popup-text-right popup-text-right-larger"><b>Airbnb Count: ${count.toLocaleString()}</b></span>`,
      { className: "marker-popup" },
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

//////////////////////////////////////////////////////////

// create legend
function addLegend(type) {
  let legend = L.control({ position: "topright" });

  legend.onAdd = function () {
    let div = L.DomUtil.create("div", "custom-legend");
    div.style.zIndex = "1000"; // ensure legend is on top

    // choropleth legend -- create gradient bar and labels based on selected metric
    if (type === "choropleth") {
      const metric = mapState.choroplethMetric;

      // if no metric selected, return empty legend
      if (!metric || !choroplethConfig[metric]) {
        div.innerHTML = "";
        return div;
      }

      // get config for selected metric to build legend
      const { scale, label } = choroplethConfig[metric];
      const [min, max] = scale.domain();

      // build legend content
      div.innerHTML = `<div class="legend-title">${label}</div>`;

      // create gradient bar and range labels
      const gradientBar = createGradientBar(scale);
      div.appendChild(gradientBar);

      const rangeLabels = createRangeLabels(metric, min, max);
      div.appendChild(rangeLabels);

      return div;
    }

    // marker legend -- set labels and colors based on type
    let labels = [],
      colors = [];
    switch (type) {
      case "License Status":
        labels = ["Licensed", "Exempt", "No License"];
        colors = labels.map(
          (label) => licenseColors[label] || licenseColors.default,
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
          (label) => propertyTypeColors[label] || propertyTypeColors.default,
        );
        div.innerHTML = '<div class="legend-title">Property Type</div>';
        break;
    }

    // append the legend colors and labels
    labels.forEach((label, index) => {
      div.innerHTML += `<div><i class="legend-color" style="background:${colors[index]}"></i>${label}</div>`;
    });

    return div;
  };

  return legend;
}

// create gradient bar for choropleth legend
function createGradientBar(scale) {
  const gradientBar = document.createElement("div");
  gradientBar.style.width = "100%";
  gradientBar.style.height = "20px";

  // generate array of colors for gradient based on scale domain
  const [min, max] = scale.domain();
  // create 100 color stops for smooth gradient
  const colors = Array.from({ length: 100 }, (_, i) => {
    const t = i / 99;
    const value = min + t * (max - min);
    return scale(value);
  });

  // set gradient background using generated colors
  gradientBar.style.background = `linear-gradient(to right, ${colors.join(",")})`;

  return gradientBar;
}

// create labels for choropleth legend price range
function createRangeLabels(metric, min, max) {
  // create container for labels
  const labelContainer = document.createElement("div");
  labelContainer.style.display = "flex";
  labelContainer.style.justifyContent = "space-between";

  // format labels based on metric type
  labelContainer.innerHTML = `
    <div>${formatMetric(metric, min)}</div>
    <div>${formatMetric(metric, max)}</div>
  `;

  return labelContainer;
}

//////////////////////////////////////////////////////////

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
      radius: 2,
      fillColor: markerColor,
      color: "black",
      weight: 0.5,
      fillOpacity: 1,
      interactive: true,
    };

    // create marker
    const marker = L.circleMarker([latitude, longitude], markerOptions);

    // bind popup to marker
    marker.bindPopup(
      createPopupContentForGroup(listingsAtLocation, markerColor),
      {
        className: "marker-popup",
        maxWidth: 400,
      },
    );

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
      const price = parseFloat(listing.price).toLocaleString(undefined, {
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
