// Description: Functions to create and initialize map layers - neighborhoods, choropleth, bubble chart, and markers

// global for popups
let lockedPopupLayer = null;

// get color for choropleth based on metric and value
function getColorForMetric(metric, value) {
  return choroplethConfig[metric].scale(value);
}

// initialize choropleth layer and zoomIn function to neighborhoods
function initializeChoroplethLayer() {
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
      const metric = resolveMetric(mapState.choroplethMetric);
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
function updateChoroplethLabels() {
  const map = mapState.map;
  const metric = resolveMetric(mapState.choroplethMetric);

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

// calculates centroid for choropleth and bubble chart layers
function calculateCentroid(feature) {
  const centroid = turf.centroid(feature);
  return [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
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

    // relative metrics - show percentage change with + or - sign
    case "license_compliance_vs_dc_pct":
    case "median_price_vs_dc_pct":
    case "reviews_per_month_vs_dc_pct":
    case "multi_listing_pct_vs_dc_pct":
    case "listings_per_1000_vs_dc_pct":
    case "total_listings_vs_dc_pct":
      return `${value > 0 ? "+" : ""}${Math.round(value)}%`;

    default:
      return value;
  }
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
      const metric = resolveMetric(mapState.choroplethMetric);

      // if no metric selected, return empty legend
      if (!metric || !choroplethConfig[metric]) {
        div.innerHTML = "";
        return div;
      }

      // get config for selected metric to build legend
      const { scale, label } = choroplethConfig[metric];

      // build legend content
      div.innerHTML = `<div class="legend-title">${label}</div>`;

      // create gradient bar and range labels
      const gradientBar = createGradientBar(scale);
      div.appendChild(gradientBar);

      const rangeLabels = createRangeLabels(metric, ...scale.domain());
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

  const domain = scale.domain();
  let colors = [];

  // conditional for diverging vs sequential scales
  if (domain.length === 3) {
    // diverging scale: [min, mid, max]
    const [min, mid, max] = domain;
    // 0-49: min to mid, 50-99: mid to max
    for (let i = 0; i < 100; i++) {
      let t, value;
      if (i < 50) {
        t = i / 49; // 0 to 1
        value = min + t * (mid - min);
      } else {
        t = (i - 50) / 49; // 0 to 1
        value = mid + t * (max - mid);
      }
      colors.push(scale(value));
    }
  } else {
    // sequential scale: [min, max]
    const [min, max] = domain;
    colors = Array.from({ length: 100 }, (_, i) => {
      const t = i / 99;
      const value = min + t * (max - min);
      return scale(value);
    });
  }

  // set gradient background using generated colors
  gradientBar.style.background = `linear-gradient(to right, ${colors.join(",")})`;

  return gradientBar;
}

// create labels for choropleth legend price range
function createRangeLabels(metric, ...domain) {
  // create container for labels
  const labelContainer = document.createElement("div");
  labelContainer.style.display = "flex";
  labelContainer.style.justifyContent = "space-between";
  labelContainer.style.alignItems = "center";

  // conditional formatting based on scale type
  if (domain.length === 3) {
    // diverging: min, mid, max
    labelContainer.innerHTML = `
      <div>${formatMetric(metric, domain[0])}</div>
      <div style="text-align:center;">${formatMetric(metric, domain[1])}</div>
      <div style="text-align:right;">${formatMetric(metric, domain[2])}</div>
    `;
  } else {
    // sequential: min, max
    labelContainer.innerHTML = `
      <div>${formatMetric(metric, domain[0])}</div>
      <div style="text-align:right;">${formatMetric(metric, domain[1])}</div>
    `;
  }

  return labelContainer;
}

//////////////////////////////////////////////////////////

// create markers grouped by lat/long, optional color by license status or property type
function createMarkers(filteredData) {
  // get license status for each listing
  // data = setLicenseStatus(filteredData);

  // empty marker layer
  const markers = L.layerGroup();

  // group listings by coordinates
  const grouped = groupListingsByLatLon(filteredData);

  // loop to populate markers
  Object.values(grouped).forEach((listingsAtLocation) => {
    const { latitude, longitude } = listingsAtLocation[0];

    // if applicable, assign color based on markerScheme
    let markerColor = defaultColors.airbnbs; // default color
    if (mapState.markerScheme === "license") {
      markerColor =
        licenseColors[listingsAtLocation[0].license] ||
        licenseColors.default;
    } else if (mapState.markerScheme === "propertyType") {
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

// // label each license status
// function setLicenseStatus(data) {
//   return data.map((item) => {
//     let license = item.license
//       ? item.license.split(":")[0].trim()
//       : "No License";
//     switch (license.toLowerCase()) {
//       case "hosted license":
//       case "unhosted license":
//         return { ...item, licenseCategory: "Licensed" };
//       case "exempt":
//         return { ...item, licenseCategory: "Exempt" };
//       default:
//         return { ...item, licenseCategory: "No License" };
//     }
//   });
// }

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
      const hoverDesc = listing.hover_description
        ? `<span class="popup-desc-muted">${listing.hover_description}</span>`
        : "";
      const price = parseFloat(listing.price).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      });
      const rating = listing.review_scores_rating
        ? `★${listing.review_scores_rating}`
        : "No rating";

      // market identity
      const header = `${listing.room_type} · ${price} · ${rating}`;

      // regulatory
      const license = listing.license

      const minNights = `Min ${listing.minimum_nights} nights`;
      // const available = listing.availability_365
      //   ? `${Math.round((listing.availability_365 / 365) * 100)}% available`
      //   : "";

      // demand / intensity
      const reviews = listing.reviews_per_month
        ? `${listing.reviews_per_month} reviews/month`
        : "";

      // commercial?
      // ? add '(Unverified host)' text for unverified hosts?
      const host = `Host: ${listing.host_name} · ${listing.host_listings_count} listings`;

      // optional badges
      const badges = [];
      if (listing.host_identity_verified === "True")
        badges.push("Verified host");
      if (!listing.license) badges.push("Unlicensed");
      if (listing.minimum_nights >= 31) badges.push("Long-term listing (not STR)");
      if (listing.host_listings_count > 5)
        badges.push("High-concentration host");

      return `
        <div class="popup-card">
          <div class="popup-head">
            ${hoverDesc}
            ${header}
          </div>

          <div class="popup-sub">
            ${license} · ${minNights}
          </div>

          <div class="popup-meta">
            ${reviews}
          </div>

          <div class="popup-meta">
            ${host}
          </div>

          ${badges.length ? `<div class="popup-badges">${badges.join(" · ")}</div>` : ""}

          <a class="popup-link" href="${listing.listing_url}" target="_blank">
            View Listing <span class="popup-ext-icon" aria-label="Opens in new tab">↗</span>
          </a>
        </div>
      `;
    })
    .join("<div class='popup-divider'></div>");

  return `
    <div class="marker-popup-wrapper" style="border-color:${markerColor}">
      ${content}
    </div>
  `;
}

// handle popup events
function popupMouseEvents(layer) {
  layer.on({
    mouseover() {
      // only open/close on hover if nothing is locked
      // highlight and reset style on hover
      if (!lockedPopupLayer) {
        highlightMarker(this);
        this.openPopup();
      }
    },

    mouseout() {
      if (!lockedPopupLayer) {
        resetMarkerStyle(this);
        this.closePopup();
      }
    },

    click() {
      // if clicking the already locked layer → unlock it
      if (lockedPopupLayer === this) {
        this.closePopup();
        lockedPopupLayer = null;
        return;
      }

      // if another popup is locked → close it first
      if (lockedPopupLayer) {
        lockedPopupLayer.closePopup();
      }

      // lock this one
      lockedPopupLayer = this;
      this.openPopup();
    },
  });

  // close any open popups when clicking on the map
  mapState.map.on("click", () => {
    if (lockedPopupLayer) {
      lockedPopupLayer.closePopup();
      lockedPopupLayer = null;
    }
  });
}

// highlight marker on hover
function highlightMarker(layer) {
  layer.setStyle({
    radius: layer.options.radius * 2,
    color: "#ffffff",
  });
}

// reset marker style on mouseout
// !!! hardcoded !!! to match createMarkers
function resetMarkerStyle(layer) {
  layer.setStyle({
    radius: 2,
    color: "black",
  });
}

//////////////////////////////////////////////////////////

// create bubble chart layer, - neighoborhood outlines and bubbles of count of airbnbs
function initializeBubbleChartLayer() {
  const bubbleLayerGroup = L.layerGroup(); // create layer group for circle markers
  initializeNeighborhoodOutlines(bubbleLayerGroup, neighborhoods);
  addBubbles(bubbleLayerGroup, neighborhoods, statsByNeighborhood);
  return bubbleLayerGroup;
}

// create neighborhood outlines layer
function initializeNeighborhoodOutlines(bubbleLayerGroup) {
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
function addBubbles(bubbleLayerGroup) {
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
