// Cinematic Shepherd.js guided tour for Capital Crashpad.
// Architecture adapted from Floodlines (tourVersion2.js):
//   • useModalOverlay: false — full dashboard visible throughout
//   • Interaction blocker during automated steps (steps 2–10)
//   • Step-scoped timers (_tourTimeout) prevent stale callbacks on navigation
//   • Post-show choreography via step .on("show") handlers
//   • Mid-step text updates via step.updateStepOptions({ text })
//   • Welcome (step 1), neighborhood intro (step 7), and handoff (step 10)
//     are explicit interaction points; analytical steps reveal content
//     progressively and then require user advancement

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

  // Mobile detection helper
  function isMobile() {
    return window.innerWidth <= 600;
  }

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
      if (!mapEl) {
        resolve();
        return;
      }
      const navH = navbar ? navbar.offsetHeight : 50;
      const rect = mapEl.getBoundingClientRect();
      const targetTop = Math.max(0, window.scrollY + rect.top - navH - 4);
      window.scrollTo({ top: targetTop, behavior: "smooth" });
      setTimeout(resolve, 650);
    });
  }

  function scrollToPlot() {
    return scrollToEl("#plot-container", isMobile() ? 0.4 : 0.5);
  }

  // ── Button spotlight functions ───────────────────────────────────────────────────

  function highlightElement(selector, duration = 1100) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);

      if (!el) {
        resolve();
        return;
      }

      el.classList.add("cc-tour-highlight");

      // Force a repaint so the transition reliably starts.
      void el.offsetWidth;

      setTimeout(() => {
        el.classList.remove("cc-tour-highlight");
        resolve();
      }, duration);
    });
  }

  function spotlightControl(selector, duration = 1100) {
    if (!isMobile()) {
      return highlightElement(selector, duration);
    }

    return (
      scrollToEl(selector, 0.65)
        .then(() => highlightElement(selector, duration))
        // .then(() => _delay(250))
        .then(() => scrollToMapTop())
    );
  }

  function spotlightChoroplethButton(buttonId, duration = 1100) {
    return spotlightControl(`#${buttonId}`, duration);
  }

  function spotlightRelativeToggle(duration = 1200) {
    return (
      scrollToEl(".slider-wrapper", 0.65)
        .then(() => highlightElement(".slider-wrapper", duration))
        // .then(() => _delay(250))
        .then(() => scrollToMapTop())
    );
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

  // ── Timer helpers ────────────────────────────────
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

  function createTour() {
    // ── Tour instance ──────────────────────────────────────────────────────
    let tour = new Shepherd.Tour({
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
      <p>In Q2 2024, roughly 1,800 Airbnb listings disappeared from Washington, D.C. in a single quarter.</p>
      <p>What did the market that remained look like?</p>
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
      classes: "cc-tour-map-step",
      title: "A More Licensed Market",
      text: `
      <p>After the contraction, a larger share of surviving listings carried a short-term rental (STR) license. The market changed while getting smaller.</p>
    `,
      beforeShowPromise() {
        return scrollToMapTop()
          .then(() => {
            if (isMobile()) {
              return scrollToEl("#choropleth-control", 0.65);
            }
            return _delay(0);
          })
          .then(() =>
            spotlightChoroplethButton("license-compliance-button", 1200),
          )
          .then(() => {
            setMetric("license_compliance", "License Compliance");
            return _delay(400);
          });
      },
      buttons: [nextBtn()],
    });

    // ── Step 3: Minimum Stays Chart ────────────────────────────────────────
    tour.addStep({
      id: "min-stays",
      title: "The 31-Night Pattern",
      text: `
    <p>Licensing isn't the whole story.</p>
  `,
      popperOptions: {
        modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
      },
      beforeShowPromise() {
        return scrollToPlot();
      },
    });

    tour.getById("min-stays").on("show", () => {
      _tourTimeout(
        "min-stays",
        () => {
          const step = tour.getById("min-stays");

          if (step) {
            step.updateStepOptions({
              classes: "cc-tour-map-step",
              text: `
            <p>Unlicensed listings cluster overwhelmingly at a 31-night minimum, just beyond D.C.'s 30-night STR threshold. Licensed listings are much more concentrated among shorter stays.</p>
            <p class="cc-tour-caveat">The pattern is clear. The reason for each listing's behavior isn't.</p>
          `,
              buttons: [nextBtn()],
            });
          }
        },
        2500,
      );
    });

    // ── Step 4: Multi-Property Hosts ───────────────────────────────────────
    // Map arrives showing the previous metric; switches live after a pause.
    // Floating card keeps map fully visible on all screen sizes.
    tour.addStep({
      id: "multi-hosts-map",
      title: "Concentration Persisted",
      text: `<p>The market shrank. But who held the listings changed much less.</p>`,
      beforeShowPromise() {
        return scrollToMapTop();
      },
    });

    tour.getById("multi-hosts-map").on("show", () => {
      _tourTimeout(
        "multi-hosts-map",
        () => {
          if (isMobile()) {
            scrollToEl("#choropleth-control", 0.65)
              .then(() =>
                spotlightChoroplethButton("multi-listing-pct-button", 1100),
              )
              .then(() => {
                setMetric("multi_listing_pct", "% Multi-Property Hosts");
                return _delay(350);
              });
          } else {
            spotlightChoroplethButton("multi-listing-pct-button", 1100).then(
              () => {
                setMetric("multi_listing_pct", "% Multi-Property Hosts");
              },
            );
          }
        },
        900,
      );

      _tourTimeout(
        "multi-hosts-map",
        () => {
          const step = tour.getById("multi-hosts-map");

          if (step) {
            step.updateStepOptions({
              classes: "cc-tour-map-step",
              text: `
            <p>Multi-property operators remain concentrated in particular neighborhoods.</p>
          `,
              buttons: [nextBtn()],
            });
          }
        },
        3000,
      );
    });

    // ── Step 5: Lorenz Curve ───────────────────────────────────────────────
    // Tooltip anchored to #secondary-controls below the chart; chart fully visible above.
    tour.addStep({
      id: "lorenz-curve",
      title: "Who Controls the Earnings",
      text: `
    <p>The same pattern appears in the money.</p>
  `,
      popperOptions: {
        modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
      },
      beforeShowPromise() {
        return scrollToPlot();
      },
    });

    tour.getById("lorenz-curve").on("show", () => {
      _tourTimeout(
        "lorenz-curve",
        () => {
          const step = tour.getById("lorenz-curve");

          if (step) {
            step.updateStepOptions({
              classes: "cc-tour-map-step",
              text: `
            <p>Before the contraction, roughly half of projected revenue went to about 10% of hosts. Afterward, the distribution barely moved.</p>
            <p>The market shrank; the concentration didn't.</p>
          `,
              buttons: [nextBtn()],
            });
          }
        },
        2500,
      );
    });

    // ── Step 6: Listing Density ────────────────────────────────────────────
    // Map arrives showing the previous metric; switches live after a pause.
    tour.addStep({
      id: "density-map",
      title: "Not Uniform Across the City",
      text: `<p>But this isn't one story everywhere.</p>`,
      beforeShowPromise() {
        return scrollToMapTop();
      },
    });

    tour.getById("density-map").on("show", () => {
      _tourTimeout(
        "density-map",
        () => {
          if (isMobile()) {
            scrollToEl("#choropleth-control", 0.65)
              .then(() =>
                spotlightChoroplethButton("listings-per-1000-button", 1100),
              )
              .then(() => {
                setMetric("listings_per_1000", "Listings per 1,000 Residents");
                return _delay(350);
              });
          } else {
            spotlightChoroplethButton("listings-per-1000-button", 1100).then(
              () => {
                setMetric("listings_per_1000", "Listings per 1,000 Residents");
              },
            );
          }
        },
        900,
      );

      _tourTimeout(
        "density-map",
        () => {
          const step = tour.getById("density-map");

          if (step) {
            step.updateStepOptions({
              classes: "cc-tour-map-step",
              text: `
            <p>Listing density — active Airbnbs per 1,000 residents — varies sharply from neighborhood to neighborhood.</p>
          `,
              buttons: [nextBtn()],
            });
          }
        },
        3000,
      );
    });

    // ── Step 7: Neighborhood Interaction Intro ─────────────────────────────
    tour.addStep({
      id: "neighborhood-intro",
      title: "Every Neighborhood Tells a Different Version",
      text: `
      <p>The citywide patterns look different on the ground.</p>
      <p>Let's zoom in.</p>
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
      text: `
            <p>Here, only about 3 in 10 listings carry an STR license. Nearly 4 in 5 belong to multi-property hosts.</p>
            <p>A very different market from the citywide average.</p>
            <p>Select any neighborhood to explore its version of the story.</p>
          `,
      attachTo: { element: "#neighborhood-stats-card", on: "top" },
      popperOptions: {
        modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
      },
      beforeShowPromise() {
        return (
          _delay(350) // moment delay before selecting and zooming
            .then(() => selectAndWaitForZoom(DEMO_NEIGHBORHOOD))
            // Wait for the map to finish zooming before scrolling to the stats card
            .then(() => _delay(1000))
            .then(() => scrollToEl("#neighborhood-stats-card", 0.45))
            .then(() => _delay(350))
        );
      },
      buttons: [nextBtn()],
    });

    // ── Step 9: Absolute / Relative Demonstration ──────────────────────────
    // Resets from the Adams Morgan demo first; then demonstrates the toggle live.
    // Visual demonstration auto-advances.
    tour.addStep({
      id: "relative-demo",
      title: "Same Market, Different Baseline",
      text: `<p>One last way to look at the map.</p>`,
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
      _tourTimeout(
        "relative-demo",
        () => {
          // Scroll to and spotlight the relative toggle before switching it on
          spotlightRelativeToggle().then(() => {
            setRelativeToggle(true);

            const step = tour.getById("relative-demo");

            if (step) {
              step.updateStepOptions({
                classes: "cc-tour-map-step",
                title: "Absolute vs. Relative",
                text: `
                <p>Relative mode compares each neighborhood with the D.C. average.</p>
                <p>Same market. Different question.</p>
              `,
                buttons: [nextBtn()],
              });
            }
          });
        },
        1800,
      );
    });

    // ── Step 10: Handoff ─────────────────────────────────────────────────
    tour.addStep({
      id: "handoff",
      title: "Now It's Yours",
      text: `
      <p>You've seen the pattern: the market contracted, licensing increased, host concentration persisted, and the changes varied sharply across neighborhoods.</p>
      <p><strong>The dashboard</strong> lets you explore those patterns yourself — across six metrics, every neighborhood, and two ways of comparing them.</p>
      <p><strong>The case study</strong> goes deeper into how the market changed over time.</p>
      <p class="cc-tour-closing"><em>What changed is visible. What caused every individual change is not.</em></p>
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
      tour = null;
    });

    tour.on("complete", () => {
      _cleanupTourState();
      resetDashboard();
      tour = null;
    });

    return tour;
  }
  // ── Tour trigger button ────────────────────────────────────────────────
  const triggerBtn = document.getElementById("take-tour-btn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => {
      if (tour.isActive()) return;
      tourCancelled = false;
      _skipReset = false;

      tour = createTour();
      tour.start();
    });
  }

  // ── Auto-show on first visit ───────────────────────────────────────────

  // const TOUR_SEEN_KEY = "ccTourSeen";
  // if (!localStorage.getItem(TOUR_SEEN_KEY)) {
  //   localStorage.setItem(TOUR_SEEN_KEY, "1");
    // Delay allows Leaflet tiles and initial chart renders to settle
    setTimeout(() => {
      tourCancelled = false;
      _skipReset = false;

       tour = createTour();
       tour.start();
    }, 1400);
  // }
}
