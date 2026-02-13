// set default color scheme
const defaultColors = {
  airbnbs: "red",
  neighborhoodLayer: "green",
  defaultGray: "#343a40", // #6c757d
  neighborhoodColor: "#198754",
  neighborhoodColorLight: "lightgreen",
  cityColor: "#0085A1",
  cityColorLight: "lightblue",
};

// color scheme for license categories
const licenseColors = {
  Licensed: "green",
  Exempt: "yellow",
  "No License": "red",
  default: "gray",
};

// color scheme for property types
const propertyTypeColors = {
  "Entire home/apt": "orange",
  "Private room": "blue",
  "Shared room": "green",
  "Hotel room": "red",
  default: "gray",
};

// choropleth colors
const choroplethConfig = {
  license_compliance: {
    scale: d3.scaleSequential(d3.interpolateBlues).domain([0, 1]),
    label: "License Compliance",
  },
  license_compliance_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolatePuOr).domain([-100, 0, 100]),
    label: "License Compliance vs DC Avg",
  },
  median_price: {
    scale: d3.scaleSequential(d3.interpolatePurples).domain([50, 250]),
    label: "Median Price",
  },
  median_price_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolatePRGn).domain([-50, 0, 50]),
    label: "Median Price vs DC Avg"
  },
  reviews_per_month: {
    scale: d3.scaleSequential(d3.interpolateGnBu).domain([0, 3]),
    label: "Reviews per Month",
  },
  reviews_per_month_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolateBrBG).domain([-50, 0, 50]),
    label: "Reviews/Month vs DC Avg"
  },
  multi_listing_pct: {
    scale: d3.scaleSequential(d3.interpolateOranges).domain([0, 1]),
    label: "% Multi-Property Hosts",
  },
  multi_listing_pct_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolateOrRd).domain([-50, 0, 50]),
    label: "% Multi-Property Hosts vs DC Avg"
  },
  listings_per_1000: {
    scale: d3.scaleSequential(d3.interpolateGreens).domain([0, 25]),
    label: "Listings per 1,000 Residents",
  },
  listings_per_1000_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolatePiYG).domain([-100, 0, 100]),
    label: "Listings per 1,000 Residents vs DC Avg"
  },
  total_listings: {
    scale: d3.scaleSequential(d3.interpolateReds).domain([0, 700]),
    label: "Total Listings",
  },
  total_listings_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolateRdBu).domain([-200, 0, 200]),
    label: "Total Listings vs Neighborhood Avg"
  },
};
