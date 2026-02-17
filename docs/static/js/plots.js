// Description: JavaScript file for creating plots

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
      renderNormalizationPlot(selectedNeighborhood);
      break;

    case "total_listings":
      renderConcentrationPareto(selectedNeighborhood);
      break;

    default:
      renderPlaceholder();
  }
}

function renderMinimumNightsPlot(neighborhood) {
  const ctx = document.getElementById("plot-canvas").getContext("2d");
  const filtered = filterListingsByNeighborhood(neighborhood);

  // Prepare bins
  const binLabels = [];
  for (let i = 1; i <= 34; i++) binLabels.push(i.toString());
  binLabels.push("35+");
  //   const binLabels = ["1", "2", "3", "4–29", "31–34", "35+"];

  // Group by license status
  const statuses = ["Licensed", "Exempt", "No License"];

  // For each status, count listings in each bin
  const datasets = statuses.map((status) => {
    const counts = Array(35).fill(0); // 0-33 for 1-34, 34 for 35+
    filtered.forEach((d) => {
      if (d.license !== status) return;
      const nights = Number(d.minimum_nights);
      if (isNaN(nights)) return;
      if (nights >= 35) counts[34]++;
      else if (nights >= 1 && nights <= 34) counts[nights - 1]++;
    });
    // const counts = [0, 0, 0, 0, 0, 0]; // for the defined bins
    // filtered.forEach((d) => {
    //   if (d.license !== status) return;
    //   const nights = Number(d.minimum_nights);
    //   if (isNaN(nights)) return;
    //   if (nights >= 35) counts[5]++;
    //   else if (nights >= 31) counts[4]++;
    //   else if (nights >= 4) counts[3]++;
    //   else if (nights === 3) counts[2]++;
    //   else if (nights === 2) counts[1]++;
    //   else if (nights === 1) counts[0]++;
    // });
    return {
      label: status,
      data: counts,
      backgroundColor: licenseColors[status],
    };
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: binLabels,
      datasets: datasets,
    },
    options: {
      plugins: {
        annotation: {
          annotations: {
            line1: {
              type: "line",
              xMin: 29.5,
              xMax: 29.5,
              //   xMin: 3.5,
              //   xMax: 3.5,
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

// function renderPriceDistribution(neighborhood) {
//   const ctx = document.getElementById("plot-canvas").getContext("2d");

//   const selected = filterListingsByNeighborhood(neighborhood)
//                     .map(d => Number(d.price))
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

//   new Chart(ctx, {
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

function renderPriceDistribution(neighborhood) {
  const dcPrices = listingsData
    .map((d) => Number(d.price))
    .filter((p) => !isNaN(p) && p > 0);
  const selected = filterListingsByNeighborhood(neighborhood)
    .map((d) => Number(d.price))
    .filter((p) => !isNaN(p) && p > 0);
  const p95 = percentile(dcPrices, 0.95);
  const dcMedian = statsByNeighborhood.find(
    (d) => d.neighborhood === "Washington, D.C.",
  )
    ? Number(
        statsByNeighborhood.find((d) => d.neighborhood === "Washington, D.C.")
          .median_price,
      )
    : 0;

  // Find neighborhood stats
  const nbStats = statsByNeighborhood.find(
    (d) => d.neighborhood === neighborhood,
  );
  const nbMedian = nbStats ? Number(nbStats.median_price) : null;
  const nbPctChange = nbStats ? Number(nbStats.median_price_vs_dc_pct) : null;
  const maxNameLen = 16;
  const truncatedName =
    neighborhood.length > maxNameLen
      ? neighborhood.slice(0, maxNameLen) + "…"
      : neighborhood;

  const trace1 = {
    y: dcPrices,
    type: "violin",
    name: "DC",
    box: { visible: true },
    meanline: { visible: true },
    marker: { color: defaultColors.cityColor },
  };

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

    // Add neighborhood median line
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

    // Add annotation on right side
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

  const layout = {
    yaxis: {
      title: "Price ($)",
      range: [0, p95],
    },
    violingap: 0.3,
    height: 600,
    legend: { orientation: "h", x: 0.5, xanchor: "center", y: 1.1 },
    shapes: shapes,
    annotations: annotations,
  };

  Plotly.newPlot("plot-container", data, layout);
}

function renderOccupancyPlot(neighborhood) {
  const ctx = document.getElementById("plot-canvas").getContext("2d");

  const filtered = filterListingsByNeighborhood(neighborhood);

  const statuses = ["Licensed", "Exempt", "No License"];

  const scatterData = statuses.map((status) => ({
    label: status,
    data: filtered
      .filter((d) => d.license === status)
      .map((d) => ({
        x: d.availability_365,
        y: d.reviews_per_month,
      })),
    backgroundColor: licenseColors[status],
  }));

  //   // combine all points for regression
  //   const allPoints = filtered
  //     .map((d) => ({
  //       x: d.availability_365,
  //       y: d.reviews_per_month,
  //     }))
  //     .filter((d) => !isNaN(d.x) && !isNaN(d.y));

  //   const { slope, intercept } = linearRegression(allPoints);

  //   const y0 = intercept;
  //   const y365 = slope * 365 + intercept;

  //   const regLine = [
  //     { x: 0, y: y0 },
  //     { x: 365, y: y365 },
  //   ];

  //   scatterData.push({
  //     label: "Regression Line",
  //     data: regLine,
  //     type: "line",
  //     showLine: true,
  //     parsing: false,
  //     borderColor: "red",
  //     borderWidth: 2,
  //     fill: false,
  //     pointRadius: 0,
  //     borderDash: [6, 6],
  //   });

  new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: scatterData,
    },
    options: {
      plugins: {
        annotation: {
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

function renderHostConcentrationLorenz(neighborhood) {
  const ctx = document.getElementById("plot-canvas").getContext("2d");
  const filtered = filterListingsByNeighborhood(neighborhood);

  const hostRevenue = {};

  filtered.forEach((d) => {
    const host = d.host_id;
    // current revenue
    const revenue = Number(d.price) * (365 - Number(d.availability_365));
    // potential additional revenue
    // const revenue = Number(d.price) * Number(d.availability_365);

    if (!hostRevenue[host]) hostRevenue[host] = 0;
    hostRevenue[host] += revenue;
  });

  const revenues = Object.values(hostRevenue).sort((a, b) => b - a);

  const totalRevenue = revenues.reduce((a, b) => a + b, 0);

  let cumulative = 0;
  const cumulativeShare = [];
  const hostPct = [];

  revenues.forEach((rev, i) => {
    cumulative += rev;
    cumulativeShare.push(cumulative / totalRevenue);
    hostPct.push((i + 1) / revenues.length);
  });

  const X = 0.05; // top 5%
  const idx = hostPct.findIndex((pct) => pct >= X);
  const revenueShareTopX = idx !== -1 ? cumulativeShare[idx] : 0;

  new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
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
        annotation: {
          annotations: {
            vline: {
              type: "line",
              xMin: X,
              xMax: X,
              borderColor: "red",
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                content: `Top ${Math.round(X * 100)}% hosts`,
                enabled: true,
                position: "start",
                backgroundColor: "#fff",
                color: "red",
              },
            },
            hline: {
              type: "line",
              yMin: revenueShareTopX,
              yMax: revenueShareTopX,
              borderColor: "blue",
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                content: `${(revenueShareTopX * 100).toFixed(1)}% revenue`,
                enabled: true,
                position: "end",
                backgroundColor: "#fff",
                color: "blue",
              },
            },
            intersection: {
              type: "point",
              xValue: X,
              yValue: revenueShareTopX,
              backgroundColor: "yellow",
              radius: 6,
              borderColor: "black",
              borderWidth: 2,
              label: {
                content: `${(revenueShareTopX * 100).toFixed(1)}% at top ${Math.round(X * 100)}%`,
                enabled: true,
                position: "center",
                backgroundColor: "yellow",
                color: "black",
              },
            },
          },
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

function renderNormalizationPlot(neighborhood) {
  const sorted = statsByNeighborhood
    .filter((d) => d.neighborhood !== "Washington, D.C.")
    .sort((a, b) => b.total_listings - a.total_listings);

  const labels = sorted.map((d) => d.neighborhood);
  const raw = sorted.map((d) => Number(d.total_listings));
  const perCapita = sorted.map((d) => Number(d.listings_per_1000));

  // highlight color for the selected neighborhood
  const rawColors = labels.map((name) =>
    name === neighborhood
      ? defaultColors.neighborhoodColor
      : defaultColors.cityColor,
  );

  const ctx = document.getElementById("plot-canvas").getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Listings (Raw)",
          data: raw,
          backgroundColor: rawColors,
          yAxisID: "y",
          order: 1,
        },
        {
          label: "Listings per 1,000",
          data: perCapita,
          type: "line",
          borderColor: "#f44336",
          yAxisID: "y1",
          order: 0,
        },
      ],
    },
    options: {
      scales: {
        x: {
          ticks: {
            callback: function (value, index, ticks) {
              const label = this.getLabelForValue(value);
              return label.length > 12 ? label.slice(0, 12) + "…" : label;
            },
            maxRotation: 90,
            minRotation: 90,
            align: "start",
            autoSkip: false,
          },
        },
        y: {
          position: "left",
          title: { display: true, text: "Listings (Raw)" },
        },
        y1: {
          position: "right",
          title: { display: true, text: "Listings per 1,000" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function renderConcentrationPareto(selectedNeighborhood) {
  const sorted = statsByNeighborhood
    .filter((d) => d.neighborhood !== "Washington, D.C.") // Exclude DC aggregate row
    .map((d) => ({
      name: d.neighborhood,
      count: Number(d.total_listings),
    }))
    .sort((a, b) => b.count - a.count);

  const cumulative = [];
  let sum = 0;
  const total = sorted.reduce((acc, d) => acc + d.count, 0);

  sorted.forEach((d) => {
    sum += d.count;
    cumulative.push((sum / total) * 100);
  });

  // Find the index where cumulative >= 80
  let idx80 = cumulative.findIndex((v) => v >= 80);
  if (idx80 === -1) idx80 = cumulative.length - 1;
  const x80 = idx80; // x-axis index (neighborhood count)
  const y80 = cumulative[idx80];

  const ctx = document.getElementById("plot-canvas").getContext("2d");

  const labels = sorted.map((d) => d.name);
  const data = sorted.map((d) => d.count);

  // Highlight color for the selected neighborhood
  const barColors = labels.map((name) =>
    selectedNeighborhood && name === selectedNeighborhood
      ? defaultColors.neighborhoodColor
      : defaultColors.cityColor,
  );

  new Chart(ctx, {
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
          backgroundColor: "#f44336", // optional, for points
          pointBackgroundColor: "#f44336", // optional, for points
          pointBorderColor: "#f44336", // optional, for points
          order: 0, // line above bars
        },
      ],
    },
    options: {
      plugins: {
        annotation: {
          annotations: {
            ref80h: {
              type: "line",
              yMin: 80,
              yMax: 80,
              yScaleID: "y1",
              borderColor: "#888",
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                content: "80%",
                enabled: true,
                position: "end",
                backgroundColor: "#fff",
                color: "#888",
              },
            },
            ref80v: {
              type: "line",
              xMin: x80,
              xMax: x80,
              xScaleID: "x",
              borderColor: "#888",
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                content: "",
                enabled: false,
              },
            },
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
              label: {
                content: "80% of Airbnbs are in these neighborhoods",
                enabled: true,
                position: "right", // or "top", "bottom", "left"
                xAdjust: 30, // move label right
                yAdjust: -10, // move label up
                backgroundColor: "#fff",
                color: "#333",
                font: { size: 12 },
              },
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: function (value, index, ticks) {
              const label = this.getLabelForValue(value);
              return label.length > 12 ? label.slice(0, 12) + "…" : label;
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

function clearPlotContainer() {
  const container = document.getElementById("plot-container");
  container.innerHTML = ""; // Remove all children
  const canvas = document.createElement("canvas");
  canvas.id = "plot-canvas";
  container.appendChild(canvas);
}

// renders a placeholder (blank or with a message)
function renderPlaceholder() {
  clearPlotContainer();
  // show a message:
  // document.getElementById("plot-container").innerHTML = "<div style='text-align:center;color:#888;'>No plot selected</div>";
}
