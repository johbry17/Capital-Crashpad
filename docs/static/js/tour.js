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

  // Positions .map-container top just below the fixed navbar for maximum map visibility
  function scrollToMapTop() {
    return new Promise((resolve) => {
      const mapEl = document.querySelector(".map-container");
      const navbar = document.querySelector(".navbar");
      if (!mapEl) { resolve(); return; }
      const navH = navbar ? navbar.offsetHeight : 50;
      const rect = mapEl.getBoundingClientRect();
      const targetTop = Math.max(0, window.scrollY + rect.top - navH - 4);
      window.scrollTo({ top: targetTop, behavior: "smooth" });
      setTimeout(resolve, 650);
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

  const nextBtn = () => ({
    text: "Next →",
    action: tour.next.bind(tour),
    classes: "cc-tour-btn cc-tour-btn--primary",
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
  // Metric is set before step shows; map is the visual subject.
  // Floating card keeps the map unobstructed on both desktop and mobile.
  tour.addStep({
    id: "licensing-map",
    title: "A More Licensed Market",
    text: `
      <p>After the contraction, the share of active listings associated with D.C. Short-Term Rental licenses increased. Neighborhoods shaded darker show higher compliance in the current data.</p>
      <p>The market became smaller — and the listings that remained were more likely to be associated with a D.C. STR license.</p>
    `,
    beforeShowPromise() {
      setMetric("license_compliance", "License Compliance");
      return scrollToMapTop();
    },
    buttons: [nextBtn()],
  });

  // ── Step 3: Minimum Stays Chart ────────────────────────────────────────
  // Tooltip anchored to #secondary-controls below the chart; chart fully visible above.
  tour.addStep({
    id: "min-stays",
    title: "The 31-Night Pattern",
    text: `
      <p>Listings cluster at two points: short stays (1–3 nights) and exactly 31-night minimums — just over D.C.'s 30-night STR licensing threshold.</p>
      <p>Unlicensed listings skew heavily toward the 31-night cluster. About 1,200 of the ~1,800 removed listings fell into that extended-stay category.</p>
      <p class="cc-tour-caveat">The data shows the pattern. It does not tell us the motivation behind each individual listing's exit.</p>
    `,
    attachTo: { element: "#secondary-controls", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
    beforeShowPromise() {
      return scrollToEl("#plot-container", 0.25);
    },
    buttons: [nextBtn()],
  });

  // ── Step 4: Multi-Property Hosts ───────────────────────────────────────
  // Map arrives showing the previous metric; switches live after a pause.
  // Floating card keeps map fully visible on all screen sizes.
  tour.addStep({
    id: "multi-hosts-map",
    title: "Concentration Persisted",
    text: `<p>The market didn't just shrink — it reoriented. Watch the map.</p>`,
    beforeShowPromise() {
      return scrollToMapTop();
    },
    buttons: [nextBtn()],
  });

  tour.getById("multi-hosts-map").on("show", () => {
    // Live metric switch — map recolors in front of the user
    _tourTimeout("multi-hosts-map", () => {
      setMetric("multi_listing_pct", "% Multi-Property Hosts");
      _tourTimeout("multi-hosts-map", () => {
        const step = tour.getById("multi-hosts-map");
        if (step)
          step.updateStepOptions({
            text: `
              <p>Among the listings that remain, portfolio operators — hosts with two or more D.C. listings — are a measurable presence in specific neighborhoods.</p>
              <p>The market changed in scale. The pattern of who holds listings did not.</p>
            `,
          });
      }, 1600);
    }, 1500);
  });

  // ── Step 5: Lorenz Curve ───────────────────────────────────────────────
  // Tooltip anchored to #secondary-controls below the chart; chart fully visible above.
  tour.addStep({
    id: "lorenz-curve",
    title: "Who Controls the Earnings",
    text: `
      <p>The Lorenz curve measures revenue inequality across hosts. The diagonal line represents perfect equality. The further the curve bends away from it, the more concentrated the earnings.</p>
      <p>The Gini coefficient summarizes that gap. Among the listings that remained in the post-reset market, revenue concentration across hosts was substantial.</p>
    `,
    attachTo: { element: "#secondary-controls", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
    beforeShowPromise() {
      return scrollToEl("#plot-container", 0.25);
    },
    buttons: [nextBtn()],
  });

  // ── Step 6: Listing Density ────────────────────────────────────────────
  // Map arrives showing the previous metric; switches live after a pause.
  tour.addStep({
    id: "density-map",
    title: "Not Uniform Across the City",
    text: `<p>Every neighborhood tells a different version of the story. Watch the map shift.</p>`,
    beforeShowPromise() {
      return scrollToMapTop();
    },
    buttons: [nextBtn()],
  });

  tour.getById("density-map").on("show", () => {
    _tourTimeout("density-map", () => {
      setMetric("listings_per_1000", "Listings per 1,000 Residents");
      _tourTimeout("density-map", () => {
        const step = tour.getById("density-map");
        if (step)
          step.updateStepOptions({
            text: `
              <p>Listing density — active Airbnbs per 1,000 residents — varies sharply by neighborhood. Dense tourist corridors show patterns that differ substantially from residential wards further from the center.</p>
              <p>The post-reset market is not just smaller; it is geographically distributed differently than before.</p>
            `,
          });
      }, 1600);
    }, 1500);
  });

  // ── Step 7: Neighborhood Interaction Intro ─────────────────────────────
  tour.addStep({
    id: "neighborhood-intro",
    title: "Every Neighborhood Tells a Different Version",
    text: `
      <p>The structural patterns you've seen — licensing rates, host concentration, listing density — play out differently across D.C.'s neighborhoods.</p>
      <p>Select any neighborhood on the map, or use the dropdown above, and the entire dashboard recalculates: the map zooms, statistics update, and the chart rebuilds for that place.</p>
      <p>Here's how that looks in one of D.C.'s most active short-term rental corridors.</p>
    `,
    attachTo: { element: "#neighborhoods-control", on: "bottom" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
    beforeShowPromise() {
      return scrollToMapTop();
    },
    buttons: [primaryBtn("See it →", () => tour.next())],
  });

  // ── Step 8: Adams Morgan Demo ──────────────────────────────────────────
  // beforeShowPromise handles the selection and waits for Leaflet zoom completion.
  // DC reset is deferred to step 9's beforeShowPromise so it happens after user advances.
  tour.addStep({
    id: "neighborhood-demo",
    title: "Adams Morgan — Kalorama — Lanier Heights",
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
    buttons: [nextBtn()],
  });

  tour.getById("neighborhood-demo").on("show", () => {
    _tourTimeout("neighborhood-demo", () => {
      const step = tour.getById("neighborhood-demo");
      if (step)
        step.updateStepOptions({
          text: `
            <p>Every metric recalculated for this neighborhood: license compliance, host concentration, estimated occupancy. The chart below shows the minimum-stay distribution for these listings specifically.</p>
            <p>Select any neighborhood on the map or in the dropdown above to see the same for any corner of D.C.</p>
          `,
        });
    }, 1500);
  });

  // ── Step 9: Absolute / Relative Demonstration ──────────────────────────
  // Resets from the Adams Morgan demo first; then demonstrates the toggle live.
  // Visual demonstration auto-advances.
  tour.addStep({
    id: "relative-demo",
    title: "Before You Explore",
    text: `<p>The map is about to shift — one tool worth seeing.</p>`,
    beforeShowPromise() {
      // Reset from the neighborhood demo; wait for the map to settle before starting
      selectNeighborhood("top");
      return waitForMapMove()
        .then(() => {
          setMetric("license_compliance", "License Compliance");
          return setRelativeToggle(false);
        })
        .then(() => _delay(300))
        .then(() => scrollToMapTop());
    },
  });

  tour.getById("relative-demo").on("show", () => {
    _tourTimeout("relative-demo", () => {
      // Live toggle — map recolors to diverging scale in front of the user
      setRelativeToggle(true);
      const step = tour.getById("relative-demo");
      if (step)
        step.updateStepOptions({
          title: "Absolute vs. Relative",
          text: `
            <p>Relative mode compares each neighborhood against the D.C. average — blue is below average, orange is above. The same metric, a different question.</p>
            <p>Toggle freely between Absolute and Relative using the control below the map.</p>
          `,
        });
      _tourTimeout("relative-demo", () => _nextStep("relative-demo"), 8000);
    }, 2500);
  });

  // ── Step 10: Brief metric demonstration before handoff ────────────────
  // Concise visual beat: one more live metric switch, then straight to handoff.
  tour.addStep({
    id: "median-price-demo",
    title: "The Same Dashboard, a Different Question",
    text: `<p>Six metrics. Two views. Every neighborhood.</p>`,
    beforeShowPromise() {
      return setRelativeToggle(false).then(() => {
        setMetric("median_price", "Median Price");
        return scrollToMapTop();
      });
    },
  });

  tour.getById("median-price-demo").on("show", () => {
    _tourTimeout("median-price-demo", () => {
      const step = tour.getById("median-price-demo");
      if (step)
        step.updateStepOptions({
          text: `
            <p>Each of the six metrics reshapes the map and the chart below it. Median Price, Reviews per Month, Host Concentration — same dashboard, different questions.</p>
            <p>The dashboard is the instrument. The exploration is yours.</p>
          `,
        });
      _tourTimeout("median-price-demo", () => _nextStep("median-price-demo"), 5000);
    }, 2000);
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
