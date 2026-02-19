// Description: JS for populating stats card

// render stats card for a given neighborhood (or citywide if "top" is passed)
function renderStatsCard(neighborhood) {
  const nameEl = document.getElementById("stats-neighborhood-name");

  if (neighborhood === "top") {
    nameEl.textContent = "Washington, D.C. Snapshot";
  } else {
    nameEl.textContent = `${neighborhood} Snapshot`;
  }

  const stats = statsByNeighborhood[neighborhood === "top"
    ? "Washington, D.C."
    : neighborhood];

  if (!stats) return;

  const formatPct = (v) =>
    v != null ? `${(+v*100).toFixed(0)}%` : "—";

  const formatNum = (v) =>
    v != null ? (+v).toLocaleString() : "—";

  document.getElementById("stat-total-listings").textContent =
    formatNum(stats.total_listings);

  document.getElementById("stat-per-1000").textContent =
    (+stats.listings_per_1000).toFixed(1);

  document.getElementById("stat-share-city").textContent =
    `${(+stats.share_city_pct * 100).toFixed(1)}%`;

  document.getElementById("stat-license-rate").textContent =
    formatPct(stats.license_compliance);

  document.getElementById("stat-entire-home").textContent =
    formatPct(stats.entire_home_pct);

  document.getElementById("stat-31plus").textContent =
    formatPct(stats.min_31plus_pct);

  document.getElementById("stat-occupancy").textContent =
    formatPct(stats.est_occupancy_pct);

  document.getElementById("stat-reviews").textContent =
    (+stats.reviews_per_month).toFixed(1);

  document.getElementById("stat-availability").textContent =
    Math.round(+stats.median_availability);

  document.getElementById("stat-multi").textContent =
    formatPct(stats.multi_listing_pct);

  document.getElementById("stat-top10").textContent =
    formatPct(stats.top10_host_share_pct);
}
