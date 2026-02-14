// // Description: Utility functions for data processing and analysis

// filter listings by neighborhood
function filterListingsByNeighborhood() {
  if (mapState.selectedNeighborhood === "top") {
    return listingsData;
  }
  return listingsData.filter(
    (listing) => listing.neighbourhood === mapState.selectedNeighborhood,
  );
}
