// Description: JavaScript file for creating plots

// global to store current Chart.js instance for cleanup before rendering new plots
let currentChart = null;

// render plot based on selected metric and neighborhood
function renderPlot(metric, selectedNeighborhood) {
  clearPlotContainer();

  switch (metric) {
    case "license_compliance":
      renderMinimumNightsPlot(selectedNeighborhood);
      break;

    case "median_price":
      renderPriceDistribution(selectedNeighborhood);
      break;

    case "reviews_per_month":
      renderOccupancyPlot(selectedNeighborhood);
      break;

    case "multi_listing_pct":
      renderHostConcentrationLorenz(selectedNeighborhood);
      break;

    case "listings_per_1000":
      renderListingDensityPlot(selectedNeighborhood);
      break;

    case "total_listings":
      renderConcentrationPareto(selectedNeighborhood);
      break;

    default:
      renderPlaceholder();
  }

  showPlotCaption(metric);
}

// utility to clear plot container before rendering a new plot
function clearPlotContainer() {
  const container = document.getElementById("plot-container");
  container.innerHTML = ""; // Remove all children
  // add a canvas element for Chart.js plots (Plotly can render directly into the container)
  const canvas = document.createElement("canvas");
  canvas.id = "plot-canvas";
  container.appendChild(canvas);
}

// renders a placeholder message
function renderPlaceholder() {
  document.getElementById("plot-container").innerHTML =
    "<div style='text-align:center;color:#888;'>No plot selected</div>";
}

function showPlotCaption(metricKey) {
  const all = document.querySelectorAll(".plot-caption");
  all.forEach((el) => (el.style.display = "none"));
  const sel = document.getElementById("caption-" + metricKey);
  if (sel) sel.style.display = "block";
}

//////////////////////////////////////////////////////////

// distribution of minimum nights by license status, with STR cutoff annotation
function renderMinimumNightsPlot(neighborhood) {
  // get container and filtered data
  const ctx = document.getElementById("plot-canvas").getContext("2d");
  const filtered = filterListingsByNeighborhood(neighborhood);

  // prepare bins
  const binLabels = [];
  for (let i = 1; i <= 34; i++) binLabels.push(i.toString());
  binLabels.push("35+");

  // group by license status
  const statuses = ["Licensed", "Exempt", "No License"];

  // for each status, count listings in each bin
  const datasets = statuses.map((status) => {
    const counts = Array(35).fill(0); // 0-33 for 1-34, 34 for 35+
    filtered.forEach((d) => {
      // if (!d.license || !d.minimum_nights) return;
      if (d.license !== status) return;
      const nights = +d.minimum_nights;
      if (isNaN(nights)) return;
      // add to appropriate bin
      if (nights >= 35) counts[34]++;
      else if (nights >= 1 && nights <= 34) counts[nights - 1]++;
    });
    return {
      label: status,
      data: counts,
      backgroundColor: licenseColors[status],
    };
  });

  // destroy existing chart
  if (currentChart) {
    currentChart.destroy();
  }
  // create new chart
  currentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: binLabels,
      datasets: datasets,
    },
    options: {
      plugins: {
        annotation: {
          annotations: {
            // short term rental cutoff line at 30 nights with label
            line1: {
              type: "line",
              xMin: 29.5,
              xMax: 29.5,
              borderColor: "#000",
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                content: "Short-Term Rental (STR) cutoff (30 nights)",
                enabled: true,
                position: "start",
                backgroundColor: "#fff",
                color: "#000",
              },
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: "Minimum Nights" },
        },
        y: {
          stacked: true,
          title: { display: true, text: "Listings" },
        },
      },
    },
  });
}

//////////////////////////////////////////////////////////

// // histogram of price distribution
// function renderPriceDistribution(neighborhood) {
//   const ctx = document.getElementById("plot-canvas").getContext("2d");

//   const selected = filterListingsByNeighborhood(neighborhood)
//                     .map(d => +d.price)
//                     .filter(p => !isNaN(p) && p <= 500 && p > 0);

//   const bins = 20;
//   const min = Math.min(...selected);
//   const max = Math.max(...selected);
//   const binWidth = (max - min) / bins;

//   const counts = Array(bins).fill(0);
//   const labels = [];

//   for (let i = 0; i < bins; i++) {
//     const lower = min + i * binWidth;
//     const upper = lower + binWidth;
//     labels.push(`$${Math.round(lower)}`);
//     selected.forEach(p => {
//       if (p >= lower && p < upper) counts[i]++;
//     });
//   }

// // destroy existing chart
// if (currentChart) {
//   currentChart.destroy();
// }
// // create new chart
// currentChart = new Chart(ctx, {
//     type: "bar",
//     data: {
//       labels,
//       datasets: [{
//         label: neighborhood,
//         data: counts,
//       }]
//     },
//     options: {
//       scales: {
//         x: { title: { display: true, text: "Nightly Price ($)" }},
//         y: { title: { display: true, text: "Listings" }}
//       }
//     }
//   });
// }

//////////////////////////////////////////////////////////

// violin plot of price distribution with median lines and annotations for DC and neighborhood medians
function renderPriceDistribution(neighborhood) {
  // clear container of chart.js canvas, or a blank white canvas appears below the plotly plot
  const container = document.getElementById("plot-container");
  container.innerHTML = ""; // Remove all children

  // prepare data: get DC and neighborhood prices
  const dcPrices = listingsData
    .map((d) => +d.price)
    .filter((p) => !isNaN(p) && p > 0);
  const selected = filterListingsByNeighborhood(neighborhood)
    .map((d) => +d.price)
    .filter((p) => !isNaN(p) && p > 0);
  // compute 95th percentile for y-axis limit to reduce skew from outliers
  const p95 = percentile(dcPrices, 0.95);
  // get DC median for annotation
  const dcMedian = statsByNeighborhood.find(
    (d) => d.neighborhood === "Washington, D.C.",
  )
    ? Number(
        statsByNeighborhood.find((d) => d.neighborhood === "Washington, D.C.")
          .median_price,
      )
    : 0;

  // get neighborhood stats and truncate name for annotation
  const nbStats = statsByNeighborhood.find(
    (d) => d.neighborhood === neighborhood,
  );
  const nbMedian = nbStats ? Number(nbStats.median_price) : null;
  const nbPctChange = nbStats ? Number(nbStats.median_price_vs_dc_pct) : null;
  const maxNameLen = 12;
  const truncatedName =
    neighborhood.length > maxNameLen
      ? neighborhood.slice(0, maxNameLen) + "…"
      : neighborhood;

  // dc violin plot trace
  const trace1 = {
    y: dcPrices,
    type: "violin",
    name: "DC",
    box: { visible: true },
    meanline: { visible: true },
    marker: { color: defaultColors.cityColor },
  };

  // add DC median line
  let shapes = [
    {
      type: "line",
      xref: "paper",
      x0: 0,
      x1: 1,
      yref: "y",
      y0: dcMedian,
      y1: dcMedian,
      line: {
        color: defaultColors.cityColor,
        width: 2,
        dash: "dash",
      },
    },
  ];

  // annotations for DC median on left side
  let annotations = [
    {
      xref: "paper",
      x: 0,
      y: dcMedian,
      xanchor: "left",
      yanchor: "middle",
      text: `DC Median:<br>$${Math.round(dcMedian)}`,
      showarrow: false,
      font: { color: defaultColors.cityColor, size: 12 },
      bgcolor: "rgba(255,255,255,0.7)",
      bordercolor: defaultColors.cityColor,
    },
  ];

  let data = [trace1];

  // if a specific neighborhood is selected (not "top"), add its violin plot and median annotation
  if (neighborhood !== "top" && nbMedian !== null) {
    const trace2 = {
      y: selected,
      type: "violin",
      name: neighborhood,
      box: { visible: true },
      meanline: { visible: true },
      marker: { color: defaultColors.neighborhoodColor },
    };
    data.push(trace2);

    // add neighborhood median line
    shapes.push({
      type: "line",
      xref: "paper",
      x0: 0,
      x1: 1,
      yref: "y",
      y0: nbMedian,
      y1: nbMedian,
      line: {
        color: defaultColors.neighborhoodColor,
        width: 2,
        dash: "dash",
      },
    });

    // add neighborhood median annotation on right side
    annotations.push({
      xref: "paper",
      x: 1,
      y: nbMedian,
      xanchor: "right",
      yanchor: "middle",
      text: `${truncatedName}<br>Median: $${Math.round(nbMedian)}<br>(${nbPctChange > 0 ? "+" : ""}${nbPctChange.toFixed(1)}%)`,
      showarrow: false,
      font: { color: defaultColors.neighborhoodColor, size: 12 },
      bgcolor: "rgba(255,255,255,0.7)",
      bordercolor: defaultColors.neighborhoodColor,
    });
  }

  // layout with y-axis limit set to 95th percentile to reduce skew from outliers, and annotations for medians
  const layout = {
    yaxis: {
      title: "Price ($)",
      range: [0, p95],
    },
    violingap: 0.3,
    height: getResponsivePlotHeight(),
    legend: { orientation: "h", x: 0.5, xanchor: "center", y: 1.1 },
    margin: { t: 30, r: 30, b: 30, l: 50 },
    shapes: shapes,
    annotations: annotations,
  };

  // config for plotly, removing unnecessary buttons
  // reduces user confusion, especially on mobile
  const config = {
    displayModeBar: "hover",
    hovermode: "closest",
    modeBarButtonsToRemove: [
      "zoom2d",
      "pan2d",
      "select2d",
      "lasso2d",
      "zoomIn2d",
      "zoomOut2d",
      "autoScale2d",
      "toggleSpikelines",
      "hoverClosestCartesian",
      "hoverCompareCartesian",
      "hoverClosestPie",
      "toggleHover",
      "toImage",
    ],
  };

  Plotly.newPlot("plot-container", data, layout, config);
}

//////////////////////////////////////////////////////////

// scatter plot of occupancy (availability_365) vs reviews_per_month, colored by license status
// with bands for high/medium/low occupancy based on availability thresholds
function renderOccupancyPlot(neighborhood) {
  // get container and filtered data
  const ctx = document.getElementById("plot-canvas").getContext("2d");
  const filtered = filterListingsByNeighborhood(neighborhood);

  // list of license statuses
  const statuses = ["Licensed", "Exempt", "No License"];

  // prepare scatter data, and color by license status
  const scatterData = statuses.map((status) => ({
    label: status,
    data: filtered
      .filter((d) => d.license === status)
      .map((d) => ({
        x: +d.availability_365,
        y: +d.reviews_per_month,
      })),
    backgroundColor: licenseColors[status] + "80", // add transparency to colors
  }));

  // destroy existing chart
  if (currentChart) {
    currentChart.destroy();
  }
  // create new chart
  currentChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: scatterData,
    },
    options: {
      plugins: {
        annotation: {
          // add colored bands for high/medium/low occupancy based on availability_365 thresholds
          annotations: {
            band1: {
              type: "box",
              xMin: 0,
              xMax: 90,
              backgroundColor: "rgba(76, 175, 80, 0.08)", // light green
              borderWidth: 0,
              label: {
                content: "High Occupancy",
                enabled: true,
                position: "start",
                color: "#333",
                backgroundColor: "rgba(255,255,255,0.7)",
              },
            },
            band2: {
              type: "box",
              xMin: 90,
              xMax: 180,
              backgroundColor: "rgba(255, 235, 59, 0.08)", // light yellow
              borderWidth: 0,
              label: {
                content: "Medium",
                enabled: true,
                position: "start",
                color: "#333",
                backgroundColor: "rgba(255,255,255,0.7)",
              },
            },
            band3: {
              type: "box",
              xMin: 180,
              xMax: 365,
              backgroundColor: "rgba(244, 67, 54, 0.08)", // light red
              borderWidth: 0,
              label: {
                content: "Low Occupancy",
                enabled: true,
                position: "start",
                color: "#333",
                backgroundColor: "rgba(255,255,255,0.7)",
              },
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Availability (days/year)" },
          max: 365,
        },
        y: { title: { display: true, text: "Reviews per Month" }, max: 10 },
      },
    },
  });
}

//////////////////////////////////////////////////////////

// Lorenz curve of host revenue concentration
// with Gini coefficient in title and annotations for top 1% and 10% hosts
function renderHostConcentrationLorenz(neighborhood) {
  // get container and filtered data
  const ctx = document.getElementById("plot-canvas").getContext("2d");
  const filtered = filterListingsByNeighborhood(neighborhood);

  // empty object to accumulate revenue by host_id
  const hostRevenue = {};

  // calculate revenue for each listing and accumulate by host_id
  filtered.forEach((d) => {
    const host = d.host_id;
    // current revenue (estimated)
    const revenue = +d.price * (365 - +d.availability_365);
    // potential additional revenue
    // const revenue = +d.price * +d.availability_365;

    // if needed, create revenue object keyed by host_id and accumulate revenue for each host
    if (!hostRevenue[host]) hostRevenue[host] = 0;
    hostRevenue[host] += revenue;
  });

  // sort hosts by revenue
  const revenues = Object.values(hostRevenue).sort((a, b) => b - a);

  // total revenue for cumulative share calculations
  const totalRevenue = revenues.reduce((a, b) => a + b, 0);

  // initialize
  let cumulative = 0;
  const cumulativeShare = [];
  const hostPct = [];

  // calculate cumulative revenue share and corresponding host percentiles for Lorenz curve
  revenues.forEach((rev, i) => {
    cumulative += rev;
    cumulativeShare.push(cumulative / totalRevenue);
    hostPct.push((i + 1) / revenues.length);
  });

  // gini coefficient (display in title)
  const gini = giniCoefficient(revenues);

  // annotations for top 10% (and conditionally 1%) hosts based on cumulative shares at those percentiles
  // with dashed lines to show intersection points on the curve
  const isMobile = window.innerWidth < 600; // mobile breakpoint
  const Xs = isMobile ? [0.1] : [0.01, 0.1];
  const annotations = {};
  Xs.forEach((X, i) => {
    const idx = hostPct.findIndex((pct) => pct >= X);
    const y = idx !== -1 ? cumulativeShare[idx] : 0;
    // vertical line
    annotations[`vline${i}`] = {
      type: "line",
      xMin: X,
      xMax: X,
      borderColor: "red",
      borderWidth: 1,
      borderDash: [6, 6],
      label: {
        content: `Top ${(X * 100).toFixed(0)}% hosts`,
        enabled: true,
        position: i === 1 ? "start" : "bottom", // 1% at bottom, 10% at start
        yAdjust: i === 1 ? 0 : 50, // move label down for 11%
        backgroundColor: "#fff",
        color: "red",
      },
    };
    // horizontal line
    annotations[`hline${i}`] = {
      type: "line",
      yMin: y,
      yMax: y,
      borderColor: "blue",
      borderWidth: 1,
      borderDash: [6, 6],
      label: {
        content: `${(y * 100).toFixed(1)}% revenue`,
        enabled: true,
        position: "end",
        backgroundColor: "#fff",
        color: "blue",
      },
    };
    // point at intersection of vertical and horizontal lines
    annotations[`intersection${i}`] = {
      type: "point",
      xValue: X,
      yValue: y,
      backgroundColor: "yellow",
      radius: 6,
      borderColor: "black",
      borderWidth: 2,
    };
    // gini coefficient label in top center of plot
    annotations.giniLabel = {
      type: "label",
      xValue: 0.5,
      yValue: 0.85,
      backgroundColor: "#fff",
      borderColor: "#2196f3",
      borderWidth: 1,
      color: "#2196f3",
      font: { size: 14, weight: "bold" },
      content: [`Gini: ${gini.toFixed(2)}`],
      enabled: true,
      position: "center",
    };
  });

  // destroy existing chart
  if (currentChart) {
    currentChart.destroy();
  }
  // create new chart
  currentChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        // dashed line for perfect equality (45 degree line)
        {
          label: "Perfect Equality",
          data: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          borderColor: "#ccc",
          borderDash: [4, 4],
          pointRadius: 0,
        },
        // Lorenz curve data points
        {
          label: "Cumulative Revenue Share",
          data: hostPct.map((x, i) => ({ x: x, y: cumulativeShare[i] })),
          fill: false,
          borderColor: "#2196f3",
        },
      ],
    },
    options: {
      plugins: {
        // title with Gini coefficient
        // title: {
        //   display: true,
        //   text: `Revenue Concentration (Gini: ${gini.toFixed(2)})`,
        // },
        // annotations for top 1% and 10% hosts and their revenue shares
        annotation: {
          annotations: annotations,
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 1,
          title: { display: true, text: "Cumulative Share of Hosts" },
          ticks: {
            callback: (v) => (v * 100).toFixed(0) + "%",
          },
        },
        y: {
          title: { display: true, text: "Cumulative Share of Revenue" },
          ticks: {
            callback: (v) => (v * 100).toFixed(0) + "%",
          },
          min: 0,
          max: 1,
        },
      },
    },
  });
}

//////////////////////////////////////////////////////////

// // dual-axis plot of total listings (bar) vs listings per 1,000 residents (line) for each neighborhood
// function renderListingDensityPlot(neighborhood) {
//   const sorted = statsByNeighborhood
//     .filter((d) => d.neighborhood !== "Washington, D.C.")
//     .sort((a, b) => b.total_listings - a.total_listings);

//   const labels = sorted.map((d) => d.neighborhood);
//   const raw = sorted.map((d) => +d.total_listings);
//   const perCapita = sorted.map((d) => +d.listings_per_1000);

//   // highlight color for the selected neighborhood
//   const rawColors = labels.map((name) =>
//     name === neighborhood
//       ? defaultColors.neighborhoodColor
//       : defaultColors.cityColor,
//   );

//   const ctx = document.getElementById("plot-canvas").getContext("2d");

//   // destroy existing chart
//   if (currentChart) {
//     currentChart.destroy();
//   }
//   // create new chart
//   currentChart = new Chart(ctx, {
//     type: "bar",
//     data: {
//       labels,
//       datasets: [
//         {
//           label: "Listings (Raw)",
//           data: raw,
//           backgroundColor: rawColors,
//           yAxisID: "y",
//           order: 1,
//         },
//         {
//           label: "Listings per 1,000",
//           data: perCapita,
//           type: "line",
//           borderColor: "#f44336",
//           yAxisID: "y1",
//           order: 0,
//         },
//       ],
//     },
//     options: {
//       scales: {
//         x: {
//           ticks: {
//             callback: function (value, index, ticks) {
//               const label = this.getLabelForValue(value);
//               return label.length > 12 ? label.slice(0, 12) + "…" : label;
//             },
//             maxRotation: 90,
//             minRotation: 90,
//             align: "start",
//             autoSkip: false,
//           },
//         },
//         y: {
//           position: "left",
//           title: { display: true, text: "Listings (Raw)" },
//         },
//         y1: {
//           position: "right",
//           title: { display: true, text: "Listings per 1,000" },
//           grid: { drawOnChartArea: false },
//         },
//       },
//     },
//   });
// }

// bubble plot of listings per 1,000 residents (y-axis) vs total listings (bubble size) for each neighborhood
function renderListingDensityPlot(neighborhood) {
  // get container
  const ctx = document.getElementById("plot-canvas").getContext("2d");

  // prepare data: sort neighborhoods by listings per 1,000 residents
  const sorted = statsByNeighborhood
    .filter((d) => d.neighborhood !== "Washington, D.C.")
    .map((d) => ({
      name: d.neighborhood,
      total: +d.total_listings,
      per1000: +d.listings_per_1000,
    }))
    .sort((a, b) => b.per1000 - a.per1000);

  // extract labels (neighborhood names)
  const labels = sorted.map((d) => d.name);

  // prepare bubble data: x = neighborhood index, y = listings per 1,000, r = scaled total listings
  const bubbleData = sorted.map((d, i) => ({
    x: i,
    y: d.per1000,
    r: Math.sqrt(d.total) * 0.6, // scale bubble size
  }));

  // highlight color for the selected neighborhood
  const backgroundColors = sorted.map((d) =>
    d.name === neighborhood
      ? defaultColors.neighborhoodColor
      : defaultColors.cityColor,
  );

  // destroy existing chart
  if (currentChart) {
    currentChart.destroy();
  }
  // create new chart
  currentChart = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Listings per 1,000 (bubble size = total listings)",
          data: bubbleData,
          backgroundColor: backgroundColors,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: "linear",
          ticks: {
            maxRotation: 90,
            minRotation: 90,
            autoSkip: false,
            callback: function (value) {
              return value.length > 12 ? value.slice(0, 12) + "…" : value;
            },
          },
        },
        y: {
          title: {
            display: true,
            text: "Listings per 1,000 Residents",
          },
        },
      },
      plugins: {
        // custom tooltip to show neighborhood name, listings per 1,000, and total listings
        tooltip: {
          callbacks: {
            label: function (context) {
              const i = context.raw.x;
              const d = sorted[i];
              return [
                d.name,
                `Per 1,000: ${d.per1000.toFixed(2)}`,
                `Total Listings: ${d.total}`,
              ];
            },
          },
        },
      },
    },
  });
}

//////////////////////////////////////////////////////////

// Pareto chart of total listings by neighborhood, with cumulative percentage line and annotation for 80% concentration point
function renderConcentrationPareto(selectedNeighborhood) {
  // get container
  const ctx = document.getElementById("plot-canvas").getContext("2d");

  // prepare data: sort neighborhoods by total listings
  const sorted = statsByNeighborhood
    .filter((d) => d.neighborhood !== "Washington, D.C.") // exclude DC aggregate row
    .map((d) => ({
      name: d.neighborhood,
      count: +d.total_listings,
    }))
    .sort((a, b) => b.count - a.count);

  // calculate cumulative percentages for the line plot
  const cumulative = [];
  let sum = 0;
  const total = sorted.reduce((acc, d) => acc + d.count, 0);

  // loop through sorted data and calculate cumulative percentage
  sorted.forEach((d) => {
    sum += d.count;
    cumulative.push((sum / total) * 100);
  });

  // find the index where cumulative >= 80
  let idx80 = cumulative.findIndex((v) => v >= 80);
  if (idx80 === -1) idx80 = cumulative.length - 1;
  const x80 = idx80; // x-axis index (neighborhood count)

  // extract labels and data for the bar plot
  const labels = sorted.map((d) => d.name);
  const data = sorted.map((d) => d.count);

  // highlight color for the selected neighborhood
  const barColors = labels.map((name) =>
    selectedNeighborhood && name === selectedNeighborhood
      ? defaultColors.neighborhoodColor
      : defaultColors.cityColor,
  );

  // destroy existing chart
  if (currentChart) {
    currentChart.destroy();
  }
  // create new chart
  currentChart = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          type: "bar",
          label: "Listings",
          data: data,
          backgroundColor: barColors,
          order: 1, // bars below
        },
        {
          type: "line",
          label: "Cumulative %",
          data: cumulative,
          yAxisID: "y1",
          borderColor: "#f44336", // red
          backgroundColor: "#f44336", // for points
          order: 0, // line above bars
        },
      ],
    },
    options: {
      plugins: {
        annotation: {
          annotations: {
            // vertical line at 80% concentration point with label
            ref80v: {
              type: "line",
              xMin: x80,
              xMax: x80,
              xScaleID: "x",
              borderColor: "#888",
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                content: "80% of Airbnbs",
                enabled: true,
                position: "start",
                backgroundColor: "#fff",
                color: "#888",
                xAdjust: -60, // move label left
              },
            },
            // point annotation at the intersection of the 80% vertical line and cumulative percentage line
            ref80point: {
              type: "point",
              xValue: x80,
              yValue: 80,
              xScaleID: "x",
              yScaleID: "y1",
              backgroundColor: "#fff",
              radius: 7,
              borderColor: "#888",
              borderWidth: 2,
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: function (value, index, ticks) {
              // Show rank as 1-based index
              return (index + 1).toString();
            },
            maxRotation: 90,
            minRotation: 90,
            align: "start",
            autoSkip: false,
          },
        },
        y: { position: "left" },
        y1: { position: "right", min: 0, max: 100 },
      },
    },
  });
}
