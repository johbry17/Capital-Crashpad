// Description: Main JavaScript file for the DC Airbnb Data Analysis project

// globals for data
let listingsData = [];
let neighborhoods = {};
let statsByNeighborhood = {};

// fetch data and geojson, clean data, populate scrape date, create map
Promise.all([
  d3.csv("./static/resources/listings_for_mapping.csv"),
  fetch("./static/resources/neighborhoods_for_mapping.geojson").then(
    (response) => response.json(),
  ),
  d3.csv("./static/resources/neighborhood_map_stats.csv"),
  d3.csv("./static/resources/dashboard_metadata.csv"),
]).then(([ld, ng, ns, sd]) => {
  listingsData = ld;
  neighborhoods = ng;
  statsByNeighborhood = ns;
  scrapeDate = sd;

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

  // initialize rankings data
  initializeRankings(statsByNeighborhood);

  // create the map
  createMap();
});

// populate scrape date
function populateScrapeDate(scrapeDate) {
  const formattedDate = dayjs(scrapeDate[0].last_scraped).format(
    "DD MMMM YYYY",
  ); // format as DD Month YYYY, e.g. 13 March 2025
  document.querySelectorAll(".last-scraped").forEach((el) => {
    el.textContent = `~${formattedDate}`;
  });
}
