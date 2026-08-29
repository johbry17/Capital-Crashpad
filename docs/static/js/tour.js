// Description: Cinematic Shepherd.js guided tour for Capital Crashpad.
// Tells the analytical story; does not act as a click-by-click UI tutorial.

function initTour() {
  // Guard: only initialize once
  if (window._ccTourInitialized) return;
  window._ccTourInitialized = true;

  // Compound neighborhood name used in step 7 demo
  const DEMO_NEIGHBORHOOD = "NW-mid Kalorama Heights, Adams Morgan, Lanier Heights";

  // ── Tour instance ─────────────────────────────────────────────────

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    keyboardNavigation: true,
    defaultStepOptions: {
      scrollTo: false, // handled manually in beforeShowPromise
      modalOverlayOpeningPadding: 6,
      modalOverlayOpeningRadius: 6,
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────

  // viewportFraction (0–1): where the element's center lands from the top of the viewport
  function scrollToEl(selector, viewportFraction) {
    if (viewportFraction === undefined) viewportFraction = 0.4;
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (!el) { resolve(); return; }
      const rect = el.getBoundingClientRect();
      const targetTop = Math.max(
        0,
        window.scrollY + rect.top + rect.height / 2 - window.innerHeight * viewportFraction
      );
      window.scrollTo({ top: targetTop, behavior: "smooth" });
      setTimeout(resolve, 650);
    });
  }

  function scrollToTop() {
    return new Promise((resolve) => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(resolve, 500);
    });
  }

  // Set choropleth metric and sync button active states
  function setMetric(metricKey, overlayLabel) {
    setChoroplethMetric(metricKey);
    syncChoroplethButtons(overlayLabel);
  }

  // Trigger neighborhood selection through the existing dropdown event chain
  // (updates mapState, stats card, plot, rankings, and map zoom all at once)
  function selectNeighborhood(name) {
    const dropdown = document.getElementById("neighborhoods-dropdown");
    if (!dropdown) return;
    dropdown.value = name;
    dropdown.dispatchEvent(new Event("change"));
  }

  // Return the dashboard to its clean default state
  function resetDashboard() {
    selectNeighborhood("top");
    setMetric("license_compliance", "License Compliance");
    if (mapState.isRelative) {
      const toggle = document.getElementById("toggle-relative");
      if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change"));
      }
    }
  }

  // ── Button factories ──────────────────────────────────────────────

  const back = () => ({
    text: "← Back",
    action: tour.back.bind(tour),
    classes: "cc-tour-btn cc-tour-btn--secondary",
  });

  const next = (label = "Next →") => ({
    text: label,
    action: tour.next.bind(tour),
    classes: "cc-tour-btn cc-tour-btn--primary",
  });

  const skip = () => ({
    text: "Skip",
    action: tour.cancel.bind(tour),
    classes: "cc-tour-btn cc-tour-btn--ghost",
  });

  // ── Step 1: The Reset (centered opening modal, no element attachment) ──

  tour.addStep({
    id: "reset",
    title: "When Platforms Clean House",
    text: `
      <p>In Q2 2024, approximately 1,800 listings disappeared from Washington, D.C.'s Airbnb market in a single quarter — concurrent with Airbnb's nationwide expansion of identity verification and hosting quality standards.</p>
      <p>This dashboard examines the market that remained after that reset.</p>
      <p class="cc-tour-caveat">What we can observe: how the market's size, composition, and structure changed. What this analysis cannot determine: why each individual listing disappeared.</p>
    `,
    beforeShowPromise() {
      resetDashboard();
      return scrollToTop();
    },
    buttons: [skip(), next()],
  });

  // ── Step 2: License Compliance Map ────────────────────────────────

  tour.addStep({
    id: "licensing-map",
    title: "A More Licensed Market",
    text: `
      <p>After the contraction, the share of active listings associated with D.C. Short-Term Rental licenses increased. Neighborhoods shaded darker show higher license compliance in the current data.</p>
      <p>The market became smaller — and measurably more licensed.</p>
    `,
    attachTo: { element: "#choropleth-control", on: "top" },
    modalOverlayOpeningPadding: 10,
    beforeShowPromise() {
      setMetric("license_compliance", "License Compliance");
      return scrollToEl("#map-id", 0.4);
    },
    buttons: [back(), skip(), next()],
  });

  // ── Step 3: Minimum Stays Chart ───────────────────────────────────

  tour.addStep({
    id: "min-stays",
    title: "The 31-Night Pattern",
    text: `
      <p>Listings cluster at two points: very short minimum stays (1–3 nights) and exactly 31-night minimums — just over D.C.'s 30-night STR licensing threshold.</p>
      <p>Unlicensed listings skew heavily toward the 31-night cluster. In the period that included the contraction, roughly 1,200 of the ~1,800 removed listings fell into that extended-stay category.</p>
      <p class="cc-tour-caveat">The data shows the pattern. It does not tell us the motivation behind each individual listing's exit.</p>
    `,
    attachTo: { element: "#plot-container", on: "bottom" },
    modalOverlayOpeningPadding: 8,
    beforeShowPromise() {
      return scrollToEl("#plot-container", 0.3);
    },
    buttons: [back(), skip(), next()],
  });

  // ── Step 4: Multi-Property Hosts Map ─────────────────────────────

  tour.addStep({
    id: "multi-hosts-map",
    title: "Concentration Persisted",
    text: `
      <p>The market didn't just shrink — it reoriented. Among the listings that remain, multi-property hosts are a measurable presence in specific neighborhoods.</p>
      <p>This metric shows the share of listings whose hosts operate two or more properties in the current D.C. dataset.</p>
    `,
    attachTo: { element: "#choropleth-control", on: "top" },
    modalOverlayOpeningPadding: 10,
    beforeShowPromise() {
      setMetric("multi_listing_pct", "% Multi-Property Hosts");
      return scrollToEl("#map-id", 0.4);
    },
    buttons: [back(), skip(), next()],
  });

  // ── Step 5: Lorenz Curve ──────────────────────────────────────────

  tour.addStep({
    id: "lorenz-curve",
    title: "Who Controls the Earnings",
    text: `
      <p>The Lorenz curve measures revenue inequality across hosts. The diagonal line represents perfect equality. The further the curve bends away from it, the more concentrated the earnings.</p>
      <p>The Gini coefficient summarizes the gap. In D.C.'s post-reset market, revenue concentration among hosts remained substantial — the platform changed in size, not in structure.</p>
    `,
    attachTo: { element: "#plot-container", on: "bottom" },
    modalOverlayOpeningPadding: 8,
    beforeShowPromise() {
      return scrollToEl("#plot-container", 0.3);
    },
    buttons: [back(), skip(), next()],
  });

  // ── Step 6: Listing Density Map ───────────────────────────────────

  tour.addStep({
    id: "density-map",
    title: "Not Uniform Across the City",
    text: `
      <p>The post-reset market isn't spread evenly across Washington. Listing density — active Airbnbs per 1,000 residents — varies sharply by neighborhood.</p>
      <p>Dense tourist corridors and high-activity areas show patterns that differ substantially from residential wards further from the center.</p>
    `,
    attachTo: { element: "#choropleth-control", on: "top" },
    modalOverlayOpeningPadding: 10,
    beforeShowPromise() {
      setMetric("listings_per_1000", "Listings per 1,000 Residents");
      return scrollToEl("#map-id", 0.4);
    },
    buttons: [back(), skip(), next()],
  });

  // ── Step 7: Neighborhood Zoom ─────────────────────────────────────

  tour.addStep({
    id: "neighborhood-zoom",
    title: "Zoom In: Adams Morgan",
    text: `
      <p>Select any neighborhood to recalculate everything for that place. The map zooms in, the statistics panel updates, and the chart below recalculates using only that neighborhood's listings.</p>
      <p>Here, the dashboard has zoomed to the Adams Morgan–Kalorama–Lanier Heights area — one of D.C.'s most active short-term rental corridors.</p>
    `,
    attachTo: { element: "#neighborhoods-control", on: "top" },
    modalOverlayOpeningPadding: 8,
    beforeShowPromise() {
      return scrollToEl("#map-id", 0.4);
    },
    buttons: [back(), skip(), next()],
  });

  // Neighborhood selected after the step appears so the user reads the explanation first
  let _neighborhoodTimeout;
  tour.getById("neighborhood-zoom").on("show", function () {
    _neighborhoodTimeout = setTimeout(() => selectNeighborhood(DEMO_NEIGHBORHOOD), 1500);
  });
  tour.getById("neighborhood-zoom").on("hide", function () {
    clearTimeout(_neighborhoodTimeout);
  });

  // ── Step 8: Stats Card ────────────────────────────────────────────

  tour.addStep({
    id: "stats-card",
    title: "Neighborhood at a Glance",
    text: `
      <p>Market scale, license compliance, occupancy proxies, and host structure — all for the selected neighborhood in a single panel.</p>
      <p>Use the Relative toggle below the map to compare the neighborhood's values against the D.C. average, rather than reading raw figures in isolation.</p>
    `,
    attachTo: { element: "#neighborhood-stats-card", on: "top" },
    modalOverlayOpeningPadding: 8,
    beforeShowPromise() {
      return scrollToEl("#neighborhood-stats-card", 0.45);
    },
    buttons: [back(), skip(), next()],
  });

  // ── Step 9: Controls Overview ─────────────────────────────────────

  tour.addStep({
    id: "controls",
    title: "Six Metrics. Two Views. Every Neighborhood.",
    text: `
      <p>These buttons correspond to six analytical perspectives: license compliance, median price, demand (reviews/month), host concentration, listing density, and total listings. Each one updates the map, the chart below, and the rankings table simultaneously.</p>
      <p>Toggle between <strong>Absolute</strong> (raw values) and <strong>Relative</strong> (compared to the D.C. average) to shift from "how large is this?" to "how does this compare?"</p>
    `,
    attachTo: { element: "#secondary-controls", on: "top" },
    modalOverlayOpeningPadding: 10,
    beforeShowPromise() {
      return scrollToEl("#secondary-controls", 0.45);
    },
    buttons: [back(), skip(), next("Continue →")],
  });

  // ── Step 10: Handoff (centered closing modal) ─────────────────────

  tour.addStep({
    id: "handoff",
    title: "Now It's Yours",
    text: `
      <p><strong>The tour</strong> traced the major structural patterns: what changed, what remained, and how the market concentrates — geographically and economically.</p>
      <p><strong>The dashboard</strong> is for exploration: every neighborhood, every metric, every view.</p>
      <p><strong>The case study</strong> provides the before-and-after temporal analysis — the quarter-by-quarter data behind the structural break.</p>
      <p class="cc-tour-closing"><em>What changed is visible. What caused every individual change is not.<br>Capital Crashpad lets you explore the market that emerged afterward — neighborhood by neighborhood, metric by metric.</em></p>
    `,
    beforeShowPromise() {
      resetDashboard();
      return scrollToTop();
    },
    buttons: [
      back(),
      {
        text: "Read the Case Study",
        action() {
          window.open("case_study.html", "_blank", "noopener,noreferrer");
        },
        classes: "cc-tour-btn cc-tour-btn--secondary",
      },
      {
        text: "Explore the Dashboard",
        action: tour.complete.bind(tour),
        classes: "cc-tour-btn cc-tour-btn--primary",
      },
    ],
  });

  // ── Lifecycle: clean reset on exit ────────────────────────────────

  tour.on("cancel", resetDashboard);
  tour.on("complete", resetDashboard);

  // ── Tour trigger button ───────────────────────────────────────────

  const triggerBtn = document.getElementById("take-tour-btn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => {
      if (tour.isActive()) return;
      tour.start();
    });
  }

  // ── Auto-show on first visit ──────────────────────────────────────

  const TOUR_SEEN_KEY = "ccTourSeen";
  if (!localStorage.getItem(TOUR_SEEN_KEY)) {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
    // Delay allows Leaflet tiles and initial chart renders to settle
    setTimeout(() => tour.start(), 1400);
  }
}
