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

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function linearRegression(data) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumXX = data.reduce((sum, d) => sum + d.x * d.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}