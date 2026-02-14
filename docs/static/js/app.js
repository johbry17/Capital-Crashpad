// Description: Main JavaScript file for the DC Airbnb Data Analysis project

// globals for data
let listingsData = [];
let neighborhoods = {};
let statsByNeighborhood = {};

// fetch data and geojson, clean data, populate scrape date, create map
Promise.all([
  d3.csv("./static/resources/airbnb_data.csv"),
  fetch("./static/resources/neighbourhoods_cleaned.geojson").then((response) =>
    response.json(),
  ),
  d3.csv("./static/resources/neighborhood_map_stats.csv"),
  d3.csv("./static/resources/scraped.csv"),
]).then(([ld, ng, ns, sd]) => {
  listingsData = ld;
  neighborhoods = ng;
  statsByNeighborhood = ns;
  scrapeDate = sd;
  // 2025 September data - fix specific price anomalies
  listingsData.forEach((listing) => {
    const p = parseFloat(listing.price);
    if (!Number.isNaN(p) && new Set([7000, 40000, 50000]).has(p)) {
      listing.price = (p / 100).toString();
    }
  });

  // convert price to number, set invalid prices to null (data cleaning)
  // note the nifty concise unary plus operator to convert string to number
  listingsData.forEach((listing) => {
    const n = +listing.price;
    listing.price = Number.isFinite(n) ? n : null;
  });

  // convert neighborhood stats to a javascript object for easy lookup
  statsByNeighborhood.forEach((row) => {
    statsByNeighborhood[row.neighborhood] = row;
  });

  // populate scrape date
  populateScrapeDate(scrapeDate);

  // show welcome modal on page load
  const modal = document.getElementById("welcome-modal");
  modal.style.display = "flex"; // toggle modal display on / off
  modal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // initialize rankings data
  initializeRankings(statsByNeighborhood);

  // create the map
  createMap();
});

// populate scrape date
function populateScrapeDate(scrapeDate) {
  const scrapeDateRow = scrapeDate.find(
    (row) => row.key === "avg_calendar_last_scraped",
  );
  const formattedDate = dayjs(scrapeDateRow.value).format("DD MMMM YYYY"); // format as DD Month YYYY, e.g. 13 March 2025
  document.querySelectorAll(".last-scraped").forEach((el) => {
    el.textContent = `Scraped data as of ~${formattedDate}`;
  });
}
