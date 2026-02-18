// // Description: Utility functions for data processing and analysis

// filter listings by neighborhood
function filterListingsByNeighborhood() {
  if (mapState.selectedNeighborhood === "top") {
    return listingsData;
  }
  return listingsData.filter(
    (listing) => listing.neighborhood === mapState.selectedNeighborhood,
  );
}

// set height of plotly based on container width for responsive design
function getResponsivePlotHeight() {
  // approximate Chart.js default aspect ratio (2:1)
  const container = document.getElementById("plot-container");
  const width = container.offsetWidth;
  // use 2:1 aspect ratio, but set a min/max for usability
  return Math.max(250, Math.min(0.5 * width, 600));
}

// calculate percentile (for box plot)
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// calculate Gini coefficient (for Lorenz curve)
function giniCoefficient(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  let cumSum = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    cumSum += sorted[i] * (i + 1);
    sum += sorted[i];
  }
  return sum === 0 ? 0 : (2 * cumSum) / (n * sum) - (n + 1) / n;
}
