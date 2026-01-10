// Description: Main JavaScript file for the DC Airbnb Data Analysis project

// variables to check if running on GitHub Pages or Flask app
const isGitPages = window.location.hostname.includes("github.io"); // for GitHub Pages
const isHostedLocally =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"; // for testing locally
const isFlaskApp = isHostedLocally && window.location.port === "5000"; // assuming Flask runs on port 5000

// set data source based on environment
const geojson =
  isGitPages || (isHostedLocally && !isFlaskApp)
    ? "./static/resources/neighbourhoods_cleaned.geojson"
    : "/static/resources/neighbourhoods_cleaned.geojson";
const getData =
  isGitPages || (isHostedLocally && !isFlaskApp)
    ? d3.csv("./static/resources/airbnb_data.csv")
    : fetch("/api/listings").then((response) => response.json());
const getPriceAvailabilityData =
  isGitPages || (isHostedLocally && !isFlaskApp)
    ? d3.csv("./static/resources/price_availability_data.csv")
    : fetch("/api/price_availability").then((response) => response.json());
const getScrapeDate =
  isGitPages || (isHostedLocally && !isFlaskApp)
    ? d3.csv("./static/resources/scraped.csv")
    : fetch("/api/scrape_date").then((response) => response.json());

// fetch data and geojson, then create map
Promise.all([
  getData,
  fetch(geojson).then((response) => response.json()),
  getPriceAvailabilityData,
  getScrapeDate,
]).then(([data, neighborhoodData, priceAvailabilityData, scrapeDate]) => {
  // filter out listings with price > 3000
  // a few listings have prices above this, errors in data entry
  // like, a $7,000/night dorm room, which should be $70/night

  // options: filter them out:
  // data = data.filter((listing) => parseFloat(listing.price) <= 3000);

  // or, divide them by 100 to fix the price
  // data.forEach((listing) => {
  //   if (parseFloat(listing.price) > 3000) {
  //     listing.price = (parseFloat(listing.price) / 100).toString();
  //   }
  // });

  // 2025 September data - fix specific price anomalies
  data.forEach((listing) => {
    const p = parseFloat(listing.price);
    if (!Number.isNaN(p) && new Set([7000, 40000, 50000]).has(p)) {
      listing.price = (p / 100).toString();
    }
  });

  // populate scrape date
  const scrapeDateRow = scrapeDate.find(
    (row) => row.key === "avg_calendar_last_scraped"
  );
  const formattedDate = dayjs(scrapeDateRow.value).format("DD MMMM YYYY"); // Format as 13 March 2025
  document.querySelectorAll(".last-scraped").forEach((el) => {
    el.textContent = `Scraped data as of ~${formattedDate}`;
  });

  const modal = document.getElementById("welcome-modal");
  modal.style.display = "flex"; // toggle modal display on / off
  modal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  createMap(neighborhoodData, data, priceAvailabilityData);
});

// main infoBox values
function updateInfoBox(listingsData, selectedNeighborhood) {
  const allListingsCount = listingsData.length;
  const filteredListings =
    selectedNeighborhood === "Washington, D.C."
      ? listingsData
      : filterListingsByNeighborhood(listingsData, selectedNeighborhood);

  // get stats for DC and neighborhood
  const neighborhoodStats = calculateStats(filteredListings);
  const dcStats = calculateStats(listingsData);

  // cache DOM elements that will be updated
  const elements = {
    neighborhoodName: document.getElementById("neighborhood-name"),
    neighborhoodCount: document.getElementById("neighborhood-count"),
    totalCount: document.getElementById("total-count"),
    totalCountAllDc: document.getElementById("total-count-all-dc"),
    dcMeanPrice: document.getElementById("dc-mean-price"),
    dcMedianPrice: document.querySelectorAll(".dc-median-price"),
    neighborhoodMeanPrice: document.getElementById("neighborhood-mean-price"),
    neighborhoodMedianPrice: document.querySelectorAll(
      ".neighborhood-median-price"
    ),
    neighborhoodPriceDiff: document.getElementById("mean-price-diff"),
    neighborhoodMedianDiff: document.getElementById("median-price-diff"),
    neighborhoodToggles: document.querySelectorAll(".neighborhood-toggle"),
    allDcComparison: document.querySelectorAll(".all-dc-comparison"),
  };

  // update text content and aria-labels
  elements.neighborhoodName.textContent = selectedNeighborhood;
  elements.neighborhoodName.setAttribute(
    "aria-label",
    `Neighborhood: ${selectedNeighborhood}`
  );
  elements.neighborhoodCount.textContent =
    filteredListings.length.toLocaleString();
  elements.neighborhoodCount.setAttribute(
    "aria-label",
    `Number of Airbnbs in neighborhood: ${filteredListings.length.toLocaleString()}`
  );
  elements.totalCount.textContent = allListingsCount.toLocaleString();
  elements.totalCount.setAttribute(
    "aria-label",
    `Total number of Airbnbs in Washington, D.C.: ${allListingsCount.toLocaleString()}`
  );
  elements.totalCountAllDc.textContent = allListingsCount.toLocaleString();
  elements.totalCountAllDc.setAttribute(
    "aria-label",
    `Total number of Airbnbs in Washington, D.C.: ${allListingsCount.toLocaleString()}`
  );
  elements.dcMeanPrice.textContent = `$${dcStats.meanPrice
    .toFixed(2)
    .toLocaleString()}`;
  elements.dcMeanPrice.setAttribute(
    "aria-label",
    `Mean price of Airbnbs in Washington, D.C.: $${dcStats.meanPrice
      .toFixed(2)
      .toLocaleString()}`
  );
  elements.dcMedianPrice.forEach((element) => {
    element.textContent = `$${dcStats.medianPrice.toFixed(2).toLocaleString()}`;
    element.setAttribute(
      "aria-label",
      `Median price of Airbnbs in Washington, D.C.: $${dcStats.medianPrice
        .toFixed(2)
        .toLocaleString()}`
    );
  });

  if (selectedNeighborhood !== "Washington, D.C.") {
    elements.neighborhoodMeanPrice.textContent = `$${neighborhoodStats.meanPrice
      .toFixed(2)
      .toLocaleString()}`;
    elements.neighborhoodMeanPrice.setAttribute(
      "aria-label",
      `Mean price of Airbnbs in ${selectedNeighborhood}: $${neighborhoodStats.meanPrice
        .toFixed(2)
        .toLocaleString()}`
    );
    elements.neighborhoodMedianPrice.forEach((element) => {
      element.textContent = `$${neighborhoodStats.medianPrice
        .toFixed(2)
        .toLocaleString()}`;
      element.setAttribute(
        "aria-label",
        `Median price of Airbnbs in ${selectedNeighborhood}: $${neighborhoodStats.medianPrice
          .toFixed(2)
          .toLocaleString()}`
      );
    });
    const meanDiff =
      ((neighborhoodStats.meanPrice - dcStats.meanPrice) / dcStats.meanPrice) *
      100;
    const medianDiff =
      ((neighborhoodStats.medianPrice - dcStats.medianPrice) /
        dcStats.medianPrice) *
      100;
    elements.neighborhoodPriceDiff.textContent = `${
      meanDiff >= 0 ? "+" : ""
    }${meanDiff.toFixed(0).toLocaleString()}%`;
    elements.neighborhoodPriceDiff.setAttribute(
      "aria-label",
      `Mean price difference: ${meanDiff >= 0 ? "+" : ""}${meanDiff
        .toFixed(0)
        .toLocaleString()}%`
    );
    elements.neighborhoodMedianDiff.textContent = `${
      medianDiff >= 0 ? "+" : ""
    }${medianDiff.toFixed(0).toLocaleString()}%`;
    elements.neighborhoodMedianDiff.setAttribute(
      "aria-label",
      `Median price difference: ${medianDiff >= 0 ? "+" : ""}${medianDiff
        .toFixed(0)
        .toLocaleString()}%`
    );
  }

  // toggle visibility of neighborhood comparison stats
  const displayStyle =
    selectedNeighborhood === "Washington, D.C." ? "none" : "block";
  elements.neighborhoodToggles.forEach(
    (toggle) => (toggle.style.display = displayStyle)
  );
  elements.allDcComparison.forEach(
    (comparison) =>
      (comparison.style.display =
        selectedNeighborhood === "Washington, D.C." ? "block" : "none")
  );
}

// 31 minimum nights info box values
function update31DaysInfoBox(listingsData, selectedNeighborhood) {
  // conditional for neighborhood filter
  let filteredListings;
  if (selectedNeighborhood === "Washington, D.C.") {
    filteredListings = listingsData;
  } else {
    filteredListings = filterListingsByNeighborhood(
      listingsData,
      selectedNeighborhood
    );
  }

  // get count and percent for 31-day minimum stay
  const { countAt31Days, percentAt31Days } =
    getListingsAt31Days(filteredListings);

  // populate the HTML and add aria-labels
  const count31NightsElement = document.getElementById("count-31-nights");
  count31NightsElement.textContent = countAt31Days.toLocaleString();
  count31NightsElement.setAttribute(
    "aria-label",
    `Number of listings with 31-day minimum stay: ${countAt31Days.toLocaleString()}`
  );

  const total31NightsElement = document.getElementById("total-31-nights");
  total31NightsElement.textContent = filteredListings.length.toLocaleString();
  total31NightsElement.setAttribute(
    "aria-label",
    `Total number of listings: ${filteredListings.length.toLocaleString()}`
  );

  const percent31NightsElement = document.getElementById("percent-31-nights");
  percent31NightsElement.textContent = `${percentAt31Days}%`;
  percent31NightsElement.setAttribute(
    "aria-label",
    `Percentage of listings with 31-day minimum stay: ${percentAt31Days}%`
  );
}

// multi-property info box values
function updateMultiListings(listingsData, selectedNeighborhood) {
  // conditional for neighborhood filter
  let filteredListings;
  if (selectedNeighborhood === "Washington, D.C.") {
    filteredListings = listingsData;
  } else {
    filteredListings = filterListingsByNeighborhood(
      listingsData,
      selectedNeighborhood
    );
  }

  // get count and percent for multi-property hosts
  const { multiPropertyListings, totalListings, percentMultiProperties } =
    getMultiPropertyData(filteredListings);

  // populate the HTML and add aria-labels
  const countMultiPropertiesElement = document.getElementById(
    "count-multi-properties"
  );
  countMultiPropertiesElement.textContent =
    multiPropertyListings.toLocaleString();
  countMultiPropertiesElement.setAttribute(
    "aria-label",
    `Number of multi-property listings: ${multiPropertyListings.toLocaleString()}`
  );

  const totalMultiPropertiesElement = document.getElementById(
    "total-multi-properties"
  );
  totalMultiPropertiesElement.textContent = totalListings.toLocaleString();
  totalMultiPropertiesElement.setAttribute(
    "aria-label",
    `Total number of listings: ${totalListings.toLocaleString()}`
  );

  const percentMultiPropertiesElement = document.getElementById(
    "percent-multi-properties"
  );
  percentMultiPropertiesElement.textContent = `${percentMultiProperties}%`;
  percentMultiPropertiesElement.setAttribute(
    "aria-label",
    `Percentage of multi-property listings: ${percentMultiProperties}%`
  );
}
