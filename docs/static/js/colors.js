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
    label: "License Compliance"
  },
  median_price: {
    scale: d3.scaleSequential(d3.interpolateViridis).domain([50, 300]),
    label: "Median Price"
  },
  // reviews_per_month: {
  //   scale: d3.scaleSequential(d3.interpolatePlasma).domain([0, 10]),
  //   label: "Reviews per Month"
  // },
  // multi_listing_pct: {
  //   scale: d3.scaleSequential(d3.interpolateOranges).domain([0, 1]),
  //   label: "% Multi-Listing Hosts"
  // },
  // listings_per_1000: {
  //   scale: d3.scaleSequential(d3.interpolateReds).domain([0, 20]),
  //   label: "Listings per 1,000"
  // }
};
