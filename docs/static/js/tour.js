// Cinematic Shepherd.js guided tour for Capital Crashpad.
// Architecture adapted from Floodlines (tourVersion2.js):
//   • useModalOverlay: false — full dashboard visible throughout
//   • Interaction blocker during automated steps (steps 2–10)
//   • Step-scoped timers (_tourTimeout) prevent stale callbacks on navigation
//   • Post-show choreography via step .on("show") handlers
//   • Mid-step text updates via step.updateStepOptions({ text })
//   • Only welcome (step 1), neighborhood intro (step 7), and handoff (step 11)
//     require user input; all other steps auto-advance

function initTour() {
  if (window._ccTourInitialized) return;
  window._ccTourInitialized = true;

  const DEMO_NEIGHBORHOOD =
    "NW-mid Kalorama Heights, Adams Morgan, Lanier Heights";

  // ── Tour state ─────────────────────────────────────────────────────────
  let tourCancelled = false;
  let tourTimers = [];
  let interactionBlocker = null;
  // Skips dashboard reset when user dismisses from the welcome step
  let _skipReset = false;

  // ── Async helpers ──────────────────────────────────────────────────────

  function _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // viewportFraction (0–1): where the element's center lands from the top of the viewport
  function scrollToEl(selector, viewportFraction) {
    if (viewportFraction === undefined) viewportFraction = 0.4;
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (!el) {
        resolve();
        return;
      }
      const rect = el.getBoundingClientRect();
      const targetTop = Math.max(
        0,
        window.scrollY +
          rect.top +
          rect.height / 2 -
          window.innerHeight * viewportFraction,
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

  // ── Dashboard helpers ──────────────────────────────────────────────────

  function setMetric(metricKey, overlayLabel) {
    setChoroplethMetric(metricKey);
    syncChoroplethButtons(overlayLabel);
  }

  function selectNeighborhood(name) {
    const dropdown = document.getElementById("neighborhoods-dropdown");
    if (!dropdown) return;
    dropdown.value = name;
    dropdown.dispatchEvent(new Event("change"));
  }

  // Resolves after the Leaflet map finishes its pan/zoom animation
  function waitForMapMove() {
    return new Promise((resolve) => {
      if (!mapState?.map) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          setTimeout(resolve, 150);
        }
      };
      mapState.map.once("moveend", finish);
      // Safety: resolve after 2s if moveend never fires
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, 2000);
    });
  }

  function selectAndWaitForZoom(name) {
    selectNeighborhood(name);
    return waitForMapMove();
  }

  function setRelativeToggle(relative) {
    if (mapState.isRelative === relative) return _delay(0);
    const toggle = document.getElementById("toggle-relative");
    if (!toggle) return _delay(0);
    toggle.checked = relative;
    toggle.dispatchEvent(new Event("change"));
    return _delay(450);
  }

  function resetDashboard() {
    if (mapState.isRelative) {
      const toggle = document.getElementById("toggle-relative");
      if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change"));
      }
    }
    selectNeighborhood("top");
    setMetric("license_compliance", "License Compliance");
  }

  // ── Timer helpers (Floodlines pattern) ────────────────────────────────
  // Step-scoped: callback silenced if tour was cancelled or step has changed

  function _tourTimeout(stepId, fn, delayMs) {
    const id = setTimeout(() => {
      if (tourCancelled) return;
      if (tour.getCurrentStep()?.id !== stepId) return;
      fn();
    }, delayMs);
    tourTimers.push(id);
    return id;
  }

  function _nextStep(expectedStepId) {
    if (tourCancelled) return;
    if (tour.getCurrentStep()?.id === expectedStepId) tour.next();
  }

  function _clearTourTimers() {
    tourTimers.forEach((id) => clearTimeout(id));
    tourTimers = [];
  }

  // ── Interaction blocker ────────────────────────────────────────────────
  // Invisible fixed div (z-index 9000) absorbs pointer events during automated
  // steps. Shepherd dialogs render at z-index 9999, so cancel icon and buttons
  // remain accessible throughout.

  function _addInteractionBlocker() {
    if (interactionBlocker) return;
    interactionBlocker = document.createElement("div");
    interactionBlocker.id = "cc-tour-blocker";
    Object.assign(interactionBlocker.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "9000",
      cursor: "default",
      pointerEvents: "all",
    });
    document.body.appendChild(interactionBlocker);
  }

  function _removeInteractionBlocker() {
    if (interactionBlocker) {
      interactionBlocker.remove();
      interactionBlocker = null;
    }
  }

  function _cleanupTourState() {
    tourCancelled = true;
    _clearTourTimers();
    _removeInteractionBlocker();
  }

  // ── Tour instance ──────────────────────────────────────────────────────
  const tour = new Shepherd.Tour({
    useModalOverlay: false,
    keyboardNavigation: true,
    defaultStepOptions: {
      scrollTo: false,
      cancelIcon: { enabled: true },
    },
  });

  // ── Button factories ───────────────────────────────────────────────────
  const primaryBtn = (text, action) => ({
    text,
    action,
    classes: "cc-tour-btn cc-tour-btn--primary",
  });

  const secondaryBtn = (text, action) => ({
    text,
    action,
    classes: "cc-tour-btn cc-tour-btn--secondary",
  });

  // ── Step 1: Welcome / opt-in ───────────────────────────────────────────
  // Interaction blocker NOT active yet — user must explicitly opt in.
  tour.addStep({
    id: "welcome",
    title: "When Platforms Clean House",
    text: `
      <p>In Q2 2024, approximately 1,800 listings disappeared from Washington, D.C.'s Airbnb market in a single quarter — concurrent with Airbnb's expansion of identity verification and hosting quality standards.</p>
      <p>This tour examines the market that remained: the structural changes visible in the data, neighborhood by neighborhood.</p>
      <p class="cc-tour-caveat">What we can observe: how the market's size, composition, and structure changed. What this analysis cannot determine: why each individual listing disappeared.</p>
      <p><em>About two minutes. No clicking required.</em></p>
    `,
    beforeShowPromise() {
      resetDashboard();
      return scrollToTop();
    },
    buttons: [
      secondaryBtn("I'll explore on my own", () => {
        _skipReset = true;
        tour.cancel();
      }),
      primaryBtn("Show me →", () => {
        _addInteractionBlocker();
        tour.next();
      }),
    ],
  });

  // ── Step 2: License Compliance ─────────────────────────────────────────
  // Choreography: control identified → brief pause → map becomes focal point
  tour.addStep({
    id: "licensing-map",
    title: "A More Licensed Market",
    text: `<p>License Compliance is the analytical starting point.</p>`,
    attachTo: { element: "#choropleth-control", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 12] } }],
    },
    beforeShowPromise() {
      setMetric("license_compliance", "License Compliance");
      return scrollToEl("#map-id", 0.4);
    },
  });

  tour.getById("licensing-map").on("show", () => {
    _tourTimeout(
      "licensing-map",
      () => {
        const step = tour.getById("licensing-map");
        if (step)
          step.updateStepOptions({
            title: "A More Licensed Market",
            text: `
            <p>After the contraction, the share of active listings associated with D.C. Short-Term Rental licenses increased. Darker neighborhoods show higher compliance in the current data.</p>
            <p>The market became smaller — and the listings that remained were more likely to be associated with a D.C. license.</p>
          `,
          });
        _tourTimeout("licensing-map", () => _nextStep("licensing-map"), 5500);
      },
      1800,
    );
  });

  // ── Step 3: Minimum Stays Chart ────────────────────────────────────────
  // Tooltip anchored above the chart title; visualization unobscured below
  tour.addStep({
    id: "min-stays",
    title: "A Pattern in the Data",
    text: `<p>The minimum-stay distribution tells its own story.</p>`,
    attachTo: { element: "#plot-title", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
    beforeShowPromise() {
      return scrollToEl("#plot-title", 0.38);
    },
  });

  tour.getById("min-stays").on("show", () => {
    _tourTimeout(
      "min-stays",
      () => {
        const step = tour.getById("min-stays");
        if (step)
          step.updateStepOptions({
            title: "The 31-Night Pattern",
            text: `
            <p>Listings cluster at two points: short stays (1–3 nights) and exactly 31-night minimums — just over D.C.'s 30-night STR licensing threshold.</p>
            <p>Unlicensed listings skew heavily toward the 31-night cluster. About 1,200 of the ~1,800 removed listings fell into that extended-stay category.</p>
            <p class="cc-tour-caveat">The data shows the pattern. It does not tell us the motivation behind each individual listing's exit.</p>
          `,
          });
        _tourTimeout("min-stays", () => _nextStep("min-stays"), 8000);
      },
      2000,
    );
  });

  // ── Step 4: Multi-Property Hosts ───────────────────────────────────────
  // Choreography: map loads in old metric → live switch → colors change → explain
  tour.addStep({
    id: "multi-hosts-map",
    title: "Returning to the Map",
    text: `<p>The market didn't just shrink — it reoriented.</p>`,
    attachTo: { element: "#choropleth-control", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 12] } }],
    },
    beforeShowPromise() {
      // Scroll to map but keep license_compliance so the user sees the old colors first
      return scrollToEl("#map-id", 0.4);
    },
  });

  tour.getById("multi-hosts-map").on("show", () => {
    // After brief hold on old metric, switch — the map recolors in front of the user
    _tourTimeout(
      "multi-hosts-map",
      () => {
        setMetric("multi_listing_pct", "% Multi-Property Hosts");
        _tourTimeout(
          "multi-hosts-map",
          () => {
            const step = tour.getById("multi-hosts-map");
            if (step)
              step.updateStepOptions({
                title: "Concentration Persisted",
                text: `
              <p>Among the listings that remain, portfolio operators — hosts with two or more D.C. listings — are a measurable presence in specific neighborhoods.</p>
              <p>The market changed in scale. The structure of who controls listings did not.</p>
            `,
              });
            _tourTimeout(
              "multi-hosts-map",
              () => _nextStep("multi-hosts-map"),
              5000,
            );
          },
          1800,
        );
      },
      1500,
    );
  });

  // ── Step 5: Lorenz Curve ───────────────────────────────────────────────
  tour.addStep({
    id: "lorenz-curve",
    title: "Who Controls the Earnings",
    text: `<p>The revenue picture from a different angle.</p>`,
    attachTo: { element: "#plot-title", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
    beforeShowPromise() {
      return scrollToEl("#plot-title", 0.38);
    },
  });

  tour.getById("lorenz-curve").on("show", () => {
    _tourTimeout(
      "lorenz-curve",
      () => {
        const step = tour.getById("lorenz-curve");
        if (step)
          step.updateStepOptions({
            title: "Who Controls the Earnings",
            text: `
            <p>The Lorenz curve measures revenue inequality across hosts. The diagonal represents perfect equality. The further the curve bends away from it, the more concentrated the earnings.</p>
            <p>The Gini coefficient summarizes that gap. Among the listings that remained in the post-reset market, revenue concentration across hosts was substantial.</p>
          `,
          });
        _tourTimeout("lorenz-curve", () => _nextStep("lorenz-curve"), 8000);
      },
      2000,
    );
  });

  // ── Step 6: Listing Density ────────────────────────────────────────────
  // Choreography: map in old metric → live switch → colors change → explain
  tour.addStep({
    id: "density-map",
    title: "Back to the Map",
    text: `<p>One more geographic view of the post-reset market.</p>`,
    attachTo: { element: "#choropleth-control", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 12] } }],
    },
    beforeShowPromise() {
      return scrollToEl("#map-id", 0.4);
    },
  });

  tour.getById("density-map").on("show", () => {
    _tourTimeout(
      "density-map",
      () => {
        setMetric("listings_per_1000", "Listings per 1,000 Residents");
        _tourTimeout(
          "density-map",
          () => {
            const step = tour.getById("density-map");
            if (step)
              step.updateStepOptions({
                title: "Not Uniform Across the City",
                text: `
              <p>Listing density — active Airbnbs per 1,000 residents — varies sharply by neighborhood. Dense tourist corridors and high-activity areas show patterns that differ substantially from residential wards further from the center.</p>
              <p>The geographic variation is a key feature of the dashboard: each neighborhood tells a different version of the same story.</p>
            `,
              });
            _tourTimeout("density-map", () => _nextStep("density-map"), 5000);
          },
          1800,
        );
      },
      1500,
    );
  });

  // ── Step 7: Neighborhood Interaction Intro (manual — user triggers demo) ─
  tour.addStep({
    id: "neighborhood-intro",
    title: "Drilling Down",
    text: `
      <p>Every element in the dashboard is linked to the neighborhood selection. Click any neighborhood on the map, or use the dropdown above, and the map zooms, the statistics panel updates, and the chart below rebuilds — all from that neighborhood's listings.</p>
      <p>Here's how it looks.</p>
    `,
    attachTo: { element: "#neighborhoods-control", on: "bottom" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
    beforeShowPromise() {
      return scrollToEl("#map-id", 0.4);
    },
    buttons: [primaryBtn("See it →", () => tour.next())],
  });

  // ── Step 8: Adams Morgan Demo ──────────────────────────────────────────
  // beforeShowPromise handles the selection and waits for Leaflet zoom completion
  tour.addStep({
    id: "neighborhood-demo",
    title: "Adams Morgan",
    text: `<p>The dashboard is recalculating…</p>`,
    attachTo: { element: "#neighborhood-stats-card", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
    beforeShowPromise() {
      return selectAndWaitForZoom(DEMO_NEIGHBORHOOD)
        .then(() => scrollToEl("#neighborhood-stats-card", 0.45))
        .then(() => _delay(350));
    },
  });

  tour.getById("neighborhood-demo").on("show", () => {
    _tourTimeout(
      "neighborhood-demo",
      () => {
        const step = tour.getById("neighborhood-demo");
        if (step)
          step.updateStepOptions({
            title: "Adams Morgan — Kalorama — Lanier Heights",
            text: `
            <p>Market scale, license compliance, estimated occupancy, and host structure — updated for this neighborhood. The chart below has also recalculated.</p>
            <p>Click any neighborhood on the map, or use the dropdown, to do the same for any area of D.C.</p>
          `,
          });
        // Reset to DC before the next scene
        _tourTimeout(
          "neighborhood-demo",
          () => {
            selectNeighborhood("top");
            _nextStep("neighborhood-demo");
          },
          7000,
        );
      },
      1500,
    );
  });

  // ── Step 9: Absolute / Relative Demonstration ──────────────────────────
  // Choreography: absolute map → live toggle switch → colors change → explain
  tour.addStep({
    id: "relative-demo",
    title: "Two Ways to See the Data",
    text: `<p>The map currently shows absolute values — the raw figures for each neighborhood.</p>`,
    attachTo: { element: "#choropleth-control", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 12] } }],
    },
    beforeShowPromise() {
      selectNeighborhood("top");
      setMetric("license_compliance", "License Compliance");
      return setRelativeToggle(false)
        .then(() => _delay(300))
        .then(() => scrollToEl("#map-id", 0.4));
    },
  });

  tour.getById("relative-demo").on("show", () => {
    _tourTimeout(
      "relative-demo",
      () => {
        // Trigger the toggle — map recolors to diverging scale in front of the user
        setRelativeToggle(true);
        const step = tour.getById("relative-demo");
        if (step)
          step.updateStepOptions({
            title: "Relative Mode",
            text: `
            <p>Relative mode compares each neighborhood against the D.C. average. Blue means below average; orange means above. The same metric, a different question.</p>
            <p>Use the toggle below the map to switch freely between Absolute and Relative.</p>
          `,
          });
        _tourTimeout("relative-demo", () => _nextStep("relative-demo"), 6000);
      },
      2500,
    );
  });

  // ── Step 10: Median Price Demonstration ───────────────────────────────
  // Map phase first; scroll to violin plot after a hold.
  // No attachTo — floating narrator card allows visual focus to move map → chart.
  tour.addStep({
    id: "median-price-demo",
    title: "The Same Dashboard, a Different Question",
    text: `<p>Switching to Median Price.</p>`,
    beforeShowPromise() {
      return setRelativeToggle(false).then(() => {
        setMetric("median_price", "Median Price");
        return scrollToEl("#map-id", 0.4);
      });
    },
  });

  tour.getById("median-price-demo").on("show", () => {
    _tourTimeout(
      "median-price-demo",
      () => {
        // Scroll to chart; floating tooltip stays visible as view changes
        scrollToEl("#plot-title", 0.38);
        const step = tour.getById("median-price-demo");
        if (step)
          step.updateStepOptions({
            title: "Price Distribution",
            text: `
            <p>Median nightly price by neighborhood — and the full distribution for the city. Taller, wider sections indicate greater density at those price points.</p>
            <p>Six metrics. Two views. Every neighborhood. The dashboard is the instrument.</p>
          `,
          });
        _tourTimeout(
          "median-price-demo",
          () => _nextStep("median-price-demo"),
          7000,
        );
      },
      3000,
    );
  });

  // ── Step 11: Handoff ───────────────────────────────────────────────────
  tour.addStep({
    id: "handoff",
    title: "Now It's Yours",
    text: `
      <p><strong>The tour</strong> traced the major structural patterns visible in the post-reset market: licensing, minimum-stay patterns, revenue concentration, geographic density.</p>
      <p><strong>The dashboard</strong> is for exploration: every neighborhood, every metric, every view.</p>
      <p><strong>The case study</strong> provides the deeper temporal analysis — the quarter-by-quarter data behind the structural break.</p>
      <p class="cc-tour-closing"><em>What changed is visible. What caused every individual change is not.<br>Capital Crashpad lets you explore the market that emerged afterward — neighborhood by neighborhood, metric by metric.</em></p>
    `,
    beforeShowPromise() {
      resetDashboard();
      return scrollToTop();
    },
    buttons: [
      secondaryBtn("Read the Case Study", () => {
        window.open("case_study.html", "_blank", "noopener,noreferrer");
      }),
      primaryBtn("Explore the Dashboard", () => tour.complete()),
    ],
  });

  // Blocker removed when handoff appears so the user can interact freely
  tour.getById("handoff").on("show", () => _removeInteractionBlocker());

  // ── Lifecycle ──────────────────────────────────────────────────────────
  tour.on("cancel", () => {
    _cleanupTourState();
    if (!_skipReset) resetDashboard();
    _skipReset = false;
  });

  tour.on("complete", () => {
    _cleanupTourState();
    resetDashboard();
  });

  // ── Tour trigger button ────────────────────────────────────────────────
  const triggerBtn = document.getElementById("take-tour-btn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => {
      if (tour.isActive()) return;
      tourCancelled = false;
      _skipReset = false;
      tour.start();
    });
  }

  // ── Auto-show on first visit ───────────────────────────────────────────
  
  const TOUR_SEEN_KEY = "ccTourSeen";
  if (!localStorage.getItem(TOUR_SEEN_KEY)) {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
    // Delay allows Leaflet tiles and initial chart renders to settle
    setTimeout(() => tour.start(), 1400);
  }
}
