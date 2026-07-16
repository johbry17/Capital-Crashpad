// set default color scheme
const defaultColors = {
  airbnbs: "#b56576",
  neighborhoodLayer: "green",
  defaultGray: "#343a40", // #6c757d
  neighborhoodColor: "#ff9800",
  // neighborhoodColorLight: "lightgreen",
  cityColor: "#90caf9",
  // cityColorLight: "lightblue",
};

// color scheme for license categories
const licenseColors = {
  Licensed: "#2a9d8f", // muted teal (positive)
  Exempt: "#e9c46a", // soft amber (neutral)
  "No License": "#e76f51", // muted coral (negative)
  default: "#6c757d",
};
// const licenseColors = {
//   Licensed: "#1b9e77",
//   Exempt: "#d95f02",
//   "No License": "#7570b3",
//   default: "#999999",
// };
// const licenseColors = {
//   Licensed: "#4caf50", // softened green
//   Exempt: "#ffb703", // mustard
//   "No License": "#d62828", // controlled red
//   default: "#adb5bd",
// };

// color scheme for property types
const propertyTypeColors = {
  "Entire home/apt": "#457b9d", // steel blue
  "Private room": "#a8dadc", // light cyan
  "Shared room": "#8d99ae", // slate
  "Hotel room": "#6d597a", // muted purple
  default: "#6c757d",
};
// const propertyTypeColors = {
//   "Entire home/apt": "#66a61e",
//   "Private room": "#e7298a",
//   "Shared room": "#a6761d",
//   "Hotel room": "#1f78b4",
//   default: "#999999",
// };
// const propertyTypeColors = {
//   "Entire home/apt": "#264653",
//   "Private room": "#2a9d8f",
//   "Shared room": "#e9c46a",
//   "Hotel room": "#f4a261",
//   default: "#adb5bd",
// };

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
    scale: d3.scaleSequential(d3.interpolatePurples).domain([100, 300]),
    label: "Median Price",
  },
  median_price_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolatePRGn).domain([-50, 0, 50]),
    label: "Median Price vs DC Avg",
  },
  reviews_per_month: {
    scale: d3.scaleSequential(d3.interpolateGnBu).domain([0, 3]),
    label: "Reviews per Month",
  },
  reviews_per_month_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolateBrBG).domain([-50, 0, 50]),
    label: "Reviews/Month vs DC Avg",
  },
  multi_listing_pct: {
    scale: d3.scaleSequential(d3.interpolateOranges).domain([0, 1]),
    label: "% Multi-Property Hosts",
  },
  multi_listing_pct_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolateOrRd).domain([-50, 0, 50]),
    label: "% Multi-Property Hosts vs DC Avg",
  },
  listings_per_1000: {
    scale: d3.scaleSequential(d3.interpolateGreens).domain([0, 25]),
    label: "Listings per 1,000 Residents",
  },
  listings_per_1000_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolatePiYG).domain([-100, 0, 100]),
    label: "Listings per 1,000 Residents vs DC Avg",
  },
  total_listings: {
    scale: d3.scaleSequential(d3.interpolateReds).domain([0, 700]),
    label: "Total Listings",
  },
  total_listings_vs_dc_pct: {
    scale: d3.scaleDiverging(d3.interpolateRdBu).domain([-200, 0, 200]),
    label: "Total Listings vs Neighborhood Avg",
  },
};
