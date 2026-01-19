// Description: JavaScript file for creating plots using Plotly.js

//resizePlots();
function resizePlots() {
  const plotIds = [
    "price-availability-plot",
    "price-plot",
    "ratings-plot",
    "license-plot",
    "license-price-plot",
    "property-type-plot",
    "property-type-price-plot",
    "minimum-nights-plot",
    "host-number-of-airbnbs-plot",
    "top-20-hosts-table",
    "median-price-plot",
  ];

  plotIds.forEach((id) => {
    const container = document.getElementById(id);
    if (container) {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // ensure dimensions are valid
      if (containerWidth > 0 && containerHeight > 0) {
        Plotly.relayout(container, {
          width: containerWidth,
          height: containerHeight,
        });
      }
    }
  });
}

// master function to call plots for all of DC
function allDCPlots(listingsData, priceAvailabilityData, colors) {
  plotPriceAvailability(priceAvailabilityData, "Washington, D.C.");
  updatePricePlot(listingsData, "Washington, D.C.", colors);
  updateRatingsPlot(listingsData, "Washington, D.C.", colors);
  plotLicenseDonut(listingsData, "Washington, D.C.", colors);
  plotLicensePrice(listingsData, "Washington, D.C.", colors);
  plotPropertyType(listingsData, "Washington, D.C.", colors);
  plotPropertyTypePrice(listingsData, "Washington, D.C.", colors);
  plotMinimumNights(listingsData, "Washington, D.C.", colors);
  plotHostAirbnbs(listingsData, "Washington, D.C.", colors);
  plotTop20Hosts(listingsData);
  plotMedianPricePerNeighborhood(listingsData, "Washington, D.C.", colors);
}

// master function to call plots for neighborhoods
function neighborhoodPlots(
  listingsData,
  selectedNeighborhood,
  priceAvailabilityData,
  colors
) {
  plotPriceAvailability(priceAvailabilityData, selectedNeighborhood);
  updatePricePlot(listingsData, selectedNeighborhood, colors);
  updateRatingsPlot(listingsData, selectedNeighborhood, colors);
  plotLicenseDonut(listingsData, selectedNeighborhood, colors);
  plotLicensePrice(listingsData, selectedNeighborhood, colors);
  plotPropertyType(listingsData, selectedNeighborhood, colors);
  plotPropertyTypePrice(listingsData, selectedNeighborhood, colors);
  plotMinimumNights(listingsData, selectedNeighborhood, colors);
  plotHostAirbnbs(listingsData, selectedNeighborhood, colors);
  plotTop20Hosts(
    filterListingsByNeighborhood(listingsData, selectedNeighborhood)
  );
  plotMedianPricePerNeighborhood(listingsData, selectedNeighborhood, colors);
}

// traces for each plot
function getLegendTraces(colors, selectedNeighborhood) {
  const showLegend = selectedNeighborhood !== "Washington, D.C.";
  return [
    {
      x: [null],
      y: [null],
      type: "bar",
      orientation: "h",
      marker: { color: colors.neighborhoodColor },
      name: "Neighborhood",
      showlegend: showLegend,
    },
    {
      x: [null],
      y: [null],
      type: "bar",
      marker: { color: colors.cityColor },
      name: "DC",
      showlegend: showLegend,
    },
  ];
}

// !!!!!toggle between GitHub Pages and Flask data filter!!!!
// plot price and availability for all of DC or a neighborhood
function plotPriceAvailability(data, selectedNeighborhood) {
  // data for all of DC
  // !!!!!toggle between GitHub Pages and Flask data filter!!!!
  const allDCData = data.filter((d) => d.neighbourhood === ""); // filter for GitHub Pages
  // const allDCData = data.filter((d) => d.neighbourhood === null); // filter for Flask
  const allDates = allDCData.map((d) => d.date);
  const allAvgPrices = allDCData.map((d) => +d.avg_price);
  const allAvailableListings = allDCData.map((d) => +d.available_listings);

  // data for neighborhood
  const neighborhoodData = data.filter(
    (d) => d.neighbourhood === selectedNeighborhood
  );
  const neighborhoodDates = neighborhoodData.map((d) => d.date);
  const neighborhoodAvgPrices = neighborhoodData.map((d) => +d.avg_price);
  const neighborhoodAvailableListings = neighborhoodData.map(
    (d) => +d.available_listings
  );

  // select data based on selectedNeighborhood
  const dates =
    selectedNeighborhood === "Washington, D.C." ? allDates : neighborhoodDates;
  const avgPrices =
    selectedNeighborhood === "Washington, D.C."
      ? allAvgPrices
      : neighborhoodAvgPrices;
  const availableListings =
    selectedNeighborhood === "Washington, D.C."
      ? allAvailableListings
      : neighborhoodAvailableListings;

  // create traces (one line for each metric)
  const trace1 = {
    x: dates,
    y: avgPrices,
    mode: "lines",
    name: "Average Price",
    line: { color: "orange" },
    hovertemplate: "<b>Price:</b> %{text}<extra></extra>",
    text: avgPrices.map(
      (price) =>
        `$${price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
    ),
  };
  const trace2 = {
    x: dates,
    y: availableListings,
    mode: "lines",
    name: "Availability",
    line: { color: "blue" },
    yaxis: "y2",
    hovertemplate: "<b>Availability:</b> %{text}<extra></extra>",
    text: availableListings.map((listing) => `${listing.toLocaleString()}`),
  };

  // March 2025!! annotations and dashed lines at 6/08, 09/09, and 12/08
  const annotations = [
    {
      x: "2025-06-08",
      y: Math.max(...avgPrices),
      xref: "x",
      yref: "y",
      text: " ",
      showarrow: true,
      arrowhead: 7,
      ax: 0,
      ay: -40,
    },
    {
      x: "2025-09-09",
      y: Math.max(...avgPrices),
      xref: "x",
      yref: "y",
      text: "Quarterly host reset phases",
      showarrow: true,
      arrowhead: 7,
      ax: 0,
      ay: -40,
    },
    {
      x: "2025-12-08",
      y: Math.max(...avgPrices),
      xref: "x",
      yref: "y",
      text: " ",
      showarrow: true,
      arrowhead: 7,
      ax: 0,
      ay: -40,
    },
  ];

  const shapes = [
    {
      type: "line",
      x0: "2025-06-08",
      y0: 0,
      x1: "2025-06-08",
      y1: Math.max(...avgPrices),
      line: {
        color: "grey",
        width: 2,
        dash: "dashdot",
      },
    },
    {
      type: "line",
      x0: "2025-09-09",
      y0: 0,
      x1: "2025-09-09",
      y1: Math.max(...avgPrices),
      line: {
        color: "grey",
        width: 2,
        dash: "dashdot",
      },
    },
    {
      type: "line",
      x0: "2025-12-08",
      y0: 0,
      x1: "2025-12-08",
      y1: Math.max(...avgPrices),
      line: {
        color: "grey",
        width: 2,
        dash: "dashdot",
      },
    },
  ];

  const layout = {
    title: `<b style="color: orange;">Price</b> and <b style="color: blue;">Availability</b> Over Year<br>(${selectedNeighborhood})<br><i style='font-size: .8em;'>Hover for details, most recent data not available</i>`,
    xaxis: { title: "Date" },
    yaxis: {
      title: "Average Price ($)",
      titlefont: { color: "orange" },
      tickfont: { color: "orange" },
    },
    yaxis2: {
      title: "Availability",
      titlefont: { color: "blue" },
      tickfont: { color: "blue" },
      overlaying: "y",
      side: "right",
    },
    hovermode: "x unified",
    legend: {
      orientation: "h",
      y: -0.3,
      x: 0.5,
      xanchor: "center",
      yanchor: "top",
    },
    annotations: annotations, // add annotations
    shapes: shapes, // add dashed lines
  };

  // plot single neighborhood or DC-wide traces
  Plotly.newPlot("price-availability-plot", [trace1, trace2], layout);
}

function boxPlotAnnotation(stats, label, xPos) {
  return {
    x: xPos,
    y: 440,
    xref: "x",
    yref: "y",
    align: "left",
    showarrow: false,
    bgcolor: "rgba(255,255,255,0.9)",
    bordercolor: "#ccc",
    borderwidth: 1,
    borderradius: 4,
    font: { size: 11 },
    text: `
      <b>${label}</b><br>
      Max: $${stats.max.toFixed(0)}<br>
      Whisker: $${stats.upperFence.toFixed(0)}<br>
      Q3: $${stats.q3.toFixed(0)}<br>
      Median: $${stats.median.toFixed(0)}<br>
      Q1: $${stats.q1.toFixed(0)}<br>
      Whisker: $${stats.lowerFence.toFixed(0)}<br>
      Min: $${stats.min.toFixed(0)}
    `,
  };
}

// mean and median price comparison for DC and neighborhood
function updatePricePlot(listingsData, selectedNeighborhood, colors) {
  const isDC = selectedNeighborhood === "Washington, D.C.";
  const filteredListings = isDC
    ? listingsData
    : filterListingsByNeighborhood(listingsData, selectedNeighborhood);

  let plotContainer = document.querySelector("#price-plot");

  // Prepare traces
  let traces = [];

  // DC box plot
  traces.push({
    y: listingsData.map((d) => d.price),
    name: "All of DC",
    type: "box",
    marker: { color: colors.cityColor },
    boxpoints: "outliers",
    line: { color: colors.cityColor },
    hovertemplate: "All of DC<br>Price: $%{y:.2f}<extra></extra>",
    showlegend: false,
  });

  // Neighborhood box plot (if not DC)
  if (!isDC) {
    traces.unshift({
      y: filteredListings.map((d) => d.price),
      name: "Neighborhood",
      type: "box",
      marker: { color: colors.neighborhoodColor },
      boxpoints: "outliers",
      line: { color: colors.neighborhoodColor },
      hovertemplate: "Neighborhood<br>Price: $%{y:.2f}<extra></extra>",
      showlegend: false,
    });
  }

  // get box plot stats for annotations, filter out null price values
  const dcStats = boxPlotStats(
    listingsData.map((d) => d.price).filter(Number.isFinite)
  );
  const annotations = [boxPlotAnnotation(dcStats, "All of DC", isDC ? 0.5 : 1)];
  if (!isDC) {
    const nbStats = boxPlotStats(
      filteredListings.map((d) => d.price).filter(Number.isFinite)
    );
    annotations.unshift(boxPlotAnnotation(nbStats, "Neighborhood", 0));
  }

  // Add legend traces for colored legend bars
  const legendTraces = getLegendTraces(colors, selectedNeighborhood);

  let layout = {
    yaxis: { title: "Price ($)", range: [0, 500] }, // y-axis stops at 500
    title: isDC
      ? `<b>Price Boxplot</b>: D.C. (<$500)`
      : `Neighborhood <b>vs.</b> D.C.<br><b>Price Boxplot</b> (<$500)`,
    boxmode: "group",
    legend: {
      orientation: "h",
      y: -0.3,
      x: 0.5,
      xanchor: "center",
      yanchor: "top",
    },
    annotations: annotations, // box plots stats
  };

  Plotly.newPlot(plotContainer, [...traces, ...legendTraces], layout);
}

// plot ratings for all of DC and a neighborhood
function updateRatingsPlot(listingsData, selectedNeighborhood, colors) {
  // calculate rating stats for DC and neighborhood
  const dcStats = calculateStats(listingsData);
  const isDC = selectedNeighborhood === "Washington, D.C.";
  const filteredListings = isDC
    ? listingsData
    : filterListingsByNeighborhood(listingsData, selectedNeighborhood);
  const neighborhoodStats = calculateStats(filteredListings);

  // get container
  let plotContainer = document.querySelector("#ratings-plot");

  // format data and labels
  let chosenData = isDC
    ? [dcStats.meanRating, dcStats.medianRating]
    : [
        neighborhoodStats.meanRating,
        neighborhoodStats.medianRating,
        dcStats.meanRating,
        dcStats.medianRating,
      ];
  let hoverText = chosenData.map(
    (value) =>
      value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " \u2605"
  );
  let xLabels = isDC
    ? ["Mean (\u2605)", "Median (\u2605)"]
    : [
        "Mean (\u2605)<br>(Neighborhood)",
        "Median (\u2605)<br>(Neighborhood)",
        "Mean (\u2605)<br>(All of DC)",
        "Median (\u2605)<br>(All of DC)",
      ];

  // create trace
  let trace = {
    x: xLabels,
    y: chosenData,
    type: "bar",
    hovertemplate: "%{text}<extra></extra>",
    text: hoverText,
    textposition: "auto",
    marker: {
      color:
        selectedNeighborhood === "Washington, D.C."
          ? [colors.cityColor, colors.cityColor]
          : [
              colors.neighborhoodColor,
              colors.neighborhoodColor,
              colors.cityColor,
              colors.cityColor,
            ],
      line: { color: "black", width: 1 },
    },
    showlegend: false,
  };

  // get legend traces
  const legendTraces = getLegendTraces(colors, selectedNeighborhood);

  // create layout
  let layout = {
    yaxis: {
      title: "Rating (\u2605)",
      range: [4, Math.max(...chosenData) + 1],
    },
    title:
      selectedNeighborhood === "Washington, D.C."
        ? `<b>Ratings</b> for Washington, D.C.<br><i style="font-size: .8em;">N.B., y-axis <b>deceptively</b> starts at 4<br>!! Bad !! Bar charts <b>should start at zero</b></i>`
        : `Neighborhood <b>vs.</b> all of DC<br><b>Ratings</b> Comparison<br><i style="font-size: .8em;">N.B., y-axis <b>deceptively</b> starts at 4<br>!! Bad !! Bar charts <b>should start at zero</b></i>`,
    legend: {
      orientation: "h",
      y: -0.3,
      x: 0.5,
      xanchor: "center",
      yanchor: "top",
    },
  };

  Plotly.newPlot(plotContainer, [trace, ...legendTraces], layout);
}

// plot license status and percentage
function plotLicenseDonut(data, selectedNeighborhood, colors) {
  // get container and calculate DC data
  const plotContainer = document.getElementById("license-plot");
  const categorizedDCData = setLicenseStatus(data);
  const licensePercentageDC = getLicensePercentage(categorizedDCData);

  // declare variables
  let neighborhoodValues, neighborhoodLabels, neighborhoodColors;
  let dcValues, dcLabels, dcTitle, dcColors;

  // assign DC data to variables
  dcLabels = ["Licensed", "Exempt", "No License"];
  dcValues = [
    licensePercentageDC["Licensed"].percent,
    licensePercentageDC["Exempt"].percent,
    licensePercentageDC["No License"].percent,
  ];
  dcTitle = `<b>License Status</b><br>for Washington, D.C.`;
  dcColors = [colors.cityColor, colors.cityColorLight, colors.defaultGray];

  // conditional for DC only or neighborhood and DC
  if (selectedNeighborhood === "Washington, D.C.") {
    // single donut for DC only
    const dcTrace = {
      labels: dcLabels,
      values: dcValues,
      type: "pie",
      hole: 0.4,
      marker: { colors: dcColors },
      hoverinfo: "label+percent",
      textinfo: "label+percent",
    };

    const layout = {
      title: dcTitle,
      showlegend: true,
      // mostly to space from top (title)
      margin: {
        l: 50,
        r: 50,
        t: 200,
        pad: 4,
      },
      legend: {
        orientation: "h",
        y: -0.3,
        x: 0.5,
        xanchor: "center",
        yanchor: "top",
      },
    };

    // plot DC only
    Plotly.newPlot(plotContainer, [dcTrace], layout);
  } else {
    // else Neighborhood and DC license status donuts
    // get neighborhood data
    const neighborhoodData = filterListingsByNeighborhood(
      data,
      selectedNeighborhood
    );
    const categorizedNeighborhoodData = setLicenseStatus(neighborhoodData);
    const licensePercentageNeighborhood = getLicensePercentage(
      categorizedNeighborhoodData
    );

    // assign neighborhood data to variables
    neighborhoodLabels = ["Licensed", "Exempt", "No License"];
    neighborhoodValues = [
      licensePercentageNeighborhood["Licensed"].percent,
      licensePercentageNeighborhood["Exempt"].percent,
      licensePercentageNeighborhood["No License"].percent,
    ];
    neighborhoodColors = [
      colors.neighborhoodColor,
      colors.neighborhoodColorLight,
      colors.defaultGray,
    ];

    // two donut charts: one for Neighborhood, one for DC
    const neighborhoodTrace = {
      labels: neighborhoodLabels,
      values: neighborhoodValues,
      type: "pie",
      hole: 0.4,
      marker: { colors: neighborhoodColors },
      hoverinfo: "label+percent",
      textinfo: "label+percent",
      domain: { row: 0, column: 0 },
      showlegend: false,
    };

    const dcTrace = {
      labels: dcLabels,
      values: dcValues,
      type: "pie",
      hole: 0.4,
      marker: { colors: dcColors },
      hoverinfo: "label+percent",
      textinfo: "label+percent",
      domain: { row: 0, column: 1 },
      showlegend: false,
    };

    // dummy traces for the legend
    const legendTraces = [
      {
        x: [null],
        y: [null],
        type: "bar",
        marker: { color: colors.neighborhoodColor },
        name: "Neighborhood",
        showlegend: true,
      },
      {
        x: [null],
        y: [null],
        type: "bar",
        marker: { color: colors.cityColor },
        name: "DC",
        showlegend: true,
      },
      {
        x: [null],
        y: [null],
        type: "bar",
        marker: { color: colors.defaultGray },
        name: "No License",
        showlegend: true,
      },
    ];

    const layout = {
      title: `<b>License Status</b> Comparison:<br>Neighborhood <b>vs.</b> Washington, D.C.`,
      grid: { rows: 1, columns: 2 },
      legend: {
        orientation: "h",
        y: -0.3,
        x: 0.5,
        xanchor: "center",
        yanchor: "top",
      },
      // mostly to space from top (title)
      margin: {
        l: 50,
        r: 50,
        t: 200,
        pad: 4,
      },
      // it was showing gridlines for some reason
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
      },
    };

    Plotly.newPlot(
      plotContainer,
      [neighborhoodTrace, dcTrace, ...legendTraces],
      layout
    );
  }
}

// // plot mean price per license category
function plotLicensePrice(data, selectedNeighborhood, colors) {
  const plotContainer = document.getElementById("license-price-plot");
  const categorizedDCData = setLicenseStatus(data);
  const averagePriceDC = getAveragePriceByLicense(categorizedDCData);

  // assign DC data to variables
  let dcLabels = ["Licensed", "Exempt", "No License"];
  let dcAvgPrices = [
    averagePriceDC["Licensed"].avgPrice,
    averagePriceDC["Exempt"].avgPrice,
    averagePriceDC["No License"].avgPrice,
  ];
  let dcTitle = `Average <b>Price by License Status</b><br>for Washington, D.C.`;
  let dcColors = [colors.cityColor, colors.cityColorLight, colors.defaultGray];

  // conditional for DC only or neighborhood and DC
  if (selectedNeighborhood === "Washington, D.C.") {
    // for DC only
    const dcTrace = {
      x: dcLabels,
      y: dcAvgPrices,
      type: "bar",
      marker: { color: dcColors, line: { color: "black", width: 1 } },
      text: dcAvgPrices.map(
        (price) => `$${parseFloat(price).toLocaleString("en-US")}`
      ),
      textposition: "auto",
      hoverinfo: "x+y",
      hovertemplate: "%{x}: $%{y:,.2f}<extra></extra>",
    };

    const layout = {
      title: dcTitle,
      showlegend: false,
      xaxis: { title: { text: "License Category", standoff: 10 } },
      yaxis: { title: "Average Price ($)" },
      margin: { l: 50, r: 50, t: 100, b: 50 },
    };

    // plot DC only
    Plotly.newPlot(plotContainer, [dcTrace], layout);
  } else {
    // compare Neighborhood and DC average prices
    const neighborhoodData = filterListingsByNeighborhood(
      data,
      selectedNeighborhood
    );
    const categorizedNeighborhoodData = setLicenseStatus(neighborhoodData);
    const averagePriceNeighborhood = getAveragePriceByLicense(
      categorizedNeighborhoodData
    );

    // assign neighborhood data to variables
    let neighborhoodAvgPrices = [
      averagePriceNeighborhood["Licensed"].avgPrice,
      averagePriceNeighborhood["Exempt"].avgPrice,
      averagePriceNeighborhood["No License"].avgPrice,
    ];
    let neighborhoodColors = [
      colors.neighborhoodColor,
      colors.neighborhoodColorLight,
      colors.defaultGray,
    ];

    // Bar chart comparison: Neighborhood vs. DC
    const neighborhoodTrace = {
      x: dcLabels,
      y: neighborhoodAvgPrices,
      type: "bar",
      marker: { color: neighborhoodColors, line: { color: "black", width: 1 } },
      text: neighborhoodAvgPrices.map(
        (price) => `$${parseFloat(price).toFixed(2).toLocaleString("en-US")}`
      ),
      textposition: "auto",
      name: "Neighborhood",
      hoverinfo: "x+y",
      hovertemplate: "%{x}: $%{y:,.2f}<extra></extra>",
      showlegend: false,
    };

    const dcTrace = {
      x: dcLabels,
      y: dcAvgPrices,
      type: "bar",
      marker: { color: dcColors, line: { color: "black", width: 1 } },
      text: dcAvgPrices.map(
        (price) => `$${parseFloat(price).toFixed(2).toLocaleString("en-US")}`
      ),
      textposition: "auto",
      name: "DC",
      hoverinfo: "x+y",
      hovertemplate: "%{x}: $%{y:,.2f}<extra></extra>",
      showlegend: false,
    };

    // dummy traces for the legend
    const legendTraces = [
      {
        x: [null],
        y: [null],
        // type: "bar",
        mode: "markers",
        marker: { color: colors.neighborhoodColor, symbol: "square", size: 12 },
        name: "Neighborhood",
        showlegend: true,
        // visible: "legendonly",
      },
      {
        x: [null],
        y: [null],
        // type: "bar",
        mode: "markers",
        marker: { color: colors.cityColor, symbol: "square", size: 12 },
        name: "DC",
        showlegend: true,
        // visible: "legendonly",
      },
      {
        x: [null],
        y: [null],
        // type: "bar",
        mode: "markers",
        marker: { color: colors.defaultGray, symbol: "square", size: 12 },
        name: "No License",
        showlegend: true,
        // visible: "legendonly",
      },
    ];

    const layout = {
      title: `Average <b>Price by License Status</b> Comparison:<br>Neighborhood <b>vs.</b> Washington, D.C.`,
      barmode: "group",
      xaxis: { title: "License Category" },
      yaxis: { title: "Average Price ($)" },
      margin: { l: 50, r: 50, t: 100, b: 50 },
      legend: {
        x: 0.5,
        y: -0.3,
        xanchor: "center",
        yanchor: "top",
        orientation: "h",
      },
    };

    Plotly.newPlot(
      plotContainer,
      [neighborhoodTrace, dcTrace, ...legendTraces],
      layout
    );
  }
}

// plot of property type percentage
function plotPropertyType(data, selectedNeighborhood, colors) {
  // get container and set data
  const plotContainer = document.getElementById("property-type-plot");
  const neighborhoodData = filterListingsByNeighborhood(
    data,
    selectedNeighborhood
  );

  // run calculations for property type percentage, total count for all of DC
  const dcPropertyTypes = getPropertyTypePercentage(data);
  const neighborhoodPropertyTypes = getPropertyTypePercentage(neighborhoodData);
  const totalDCCount = Object.values(dcPropertyTypes).reduce(
    (acc, obj) => acc + obj.count,
    0
  );

  // declare variables
  let percents, counts, xLabels, title, markerColors, customdata;

  // conditional to set data and labels for all of DC, maybe neighborhood
  if (selectedNeighborhood === "Washington, D.C.") {
    // combine DC data
    let combinedData = Object.keys(dcPropertyTypes).map((key) => ({
      label: key,
      percent: dcPropertyTypes[key].percent,
      count: dcPropertyTypes[key].count,
    }));

    // sort
    combinedData.sort((a, b) => a.percent - b.percent);

    // assign variables
    percents = combinedData.map((item) => item.percent);
    counts = combinedData.map((item) => item.count);
    xLabels = combinedData.map((item) => item.label);
    title = `<b>Property Type</b> for Washington, D.C.<br><i style="font-size: .8em;">Percent of available Airbnb's</i>`;
    markerColors = combinedData.map((item) => colors.cityColor);
    customdata = counts.map((count) => ({
      count: count.toLocaleString(),
      total: totalDCCount.toLocaleString(),
    }));
  } else {
    // get total count for neighborhood
    const totalNeighborhoodCount = Object.values(
      neighborhoodPropertyTypes
    ).reduce((acc, obj) => acc + obj.count, 0);

    // combine neighborhood and DC data
    let combinedData = [
      ...Object.keys(neighborhoodPropertyTypes).map((key) => ({
        label: `${key}<br>(Neighborhood)`,
        percent: neighborhoodPropertyTypes[key].percent,
        count: neighborhoodPropertyTypes[key].count,
      })),
      ...Object.keys(dcPropertyTypes).map((key) => ({
        label: `${key}<br>(All of DC)`,
        percent: dcPropertyTypes[key].percent,
        count: dcPropertyTypes[key].count,
      })),
    ];

    // sort
    combinedData.sort((a, b) => a.percent - b.percent);

    // assign variables
    percents = combinedData.map((item) => item.percent);
    counts = combinedData.map((item) => item.count);
    xLabels = combinedData.map((item) => item.label);
    markerColors = combinedData.map((item) =>
      item.label.includes("Neighborhood")
        ? colors.neighborhoodColor
        : colors.cityColor
    );
    title = `Neighborhood <b>vs.</b> Washington, D.C.<br><b>Property Type</b> Comparison<br><i style="font-size: .8em;">Percent of available Airbnb's in Area</i>`;
    customdata = combinedData.map((item) => ({
      count: item.count.toLocaleString(),
      total: item.label.includes("Neighborhood")
        ? totalNeighborhoodCount.toLocaleString()
        : totalDCCount.toLocaleString(),
    }));
  }

  const trace = {
    y: xLabels,
    x: percents,
    type: "bar",
    orientation: "h",
    text: percents.map((percent) => percent + "%"),
    textposition: "auto",
    hovertemplate:
      "Percent: <b>%{x}%</b><br>Count: <b>%{customdata.count}</b> of %{customdata.total}<br><extra></extra>",
    customdata: customdata,
    marker: {
      color: markerColors,
      line: { color: "black", width: 1 },
    },
    showlegend: false, // hide legend for the main trace
  };

  // get legend traces
  const legendTraces = getLegendTraces(colors, selectedNeighborhood);

  const layout = {
    xaxis: { title: "Percent (%) of Total" },
    yaxis: {
      // title: "Property Type" ,
      tickangle: 35,
    },
    title: title,
    legend: {
      orientation: "h",
      y: -0.3,
      x: 0.5,
      xanchor: "center",
      yanchor: "top",
    },
  };

  Plotly.newPlot(plotContainer, [trace, ...legendTraces], layout);
}

// plot mean price per property type
function plotPropertyTypePrice(data, selectedNeighborhood, colors) {
  const plotContainer = document.getElementById("property-type-price-plot");
  const neighborhoodData = filterListingsByNeighborhood(
    data,
    selectedNeighborhood
  );

  // calculate average price for each property type
  const dcPropertyTypes = getPropertyTypePrice(data);
  const neighborhoodPropertyTypes = getPropertyTypePrice(neighborhoodData);

  // declare variables
  let dcLabels, dcAvgPrices, dcTitle, dcColors;
  let neighborhoodLabels, neighborhoodAvgPrices, neighborhoodColors;

  // assign DC data to variables
  dcLabels = Object.keys(dcPropertyTypes);
  dcAvgPrices = Object.values(dcPropertyTypes).map((obj) => obj.avgPrice);
  dcTitle = `Average <b>Price by Property Type</b><br>for Washington, D.C.`;
  dcColors = dcLabels.map((label) => colors.cityColor);

  // conditional for DC only or neighborhood and DC
  if (selectedNeighborhood === "Washington, D.C.") {
    // create trace
    const dcTrace = {
      x: dcLabels,
      y: dcAvgPrices,
      type: "bar",
      marker: { color: dcColors, line: { color: "black", width: 1 } },
      text: dcAvgPrices.map(
        (price) => `$${parseFloat(price).toFixed(2).toLocaleString("en-US")}`
      ),
      textposition: "auto",
      hoverinfo: "x+y",
      hovertemplate: "%{x}: $%{y:,.2f}<extra></extra>",
    };

    const layout = {
      title: dcTitle,
      showlegend: false,
      xaxis: { title: { text: "Property Type", standoff: 10 } },
      yaxis: { title: "Average Price ($)" },
      margin: { l: 50, r: 50, t: 100, b: 50 },
    };

    // plot DC only
    Plotly.newPlot(plotContainer, [dcTrace], layout);
  } else {
    // assign neighborhood data to variables
    neighborhoodLabels = Object.keys(neighborhoodPropertyTypes);
    neighborhoodAvgPrices = Object.values(neighborhoodPropertyTypes).map(
      (obj) => obj.avgPrice
    );
    neighborhoodColors = neighborhoodLabels.map(
      (label) => colors.neighborhoodColor
    );

    // create trace
    const neighborhoodTrace = {
      x: neighborhoodLabels,
      y: neighborhoodAvgPrices,
      type: "bar",
      marker: { color: neighborhoodColors, line: { color: "black", width: 1 } },
      text: neighborhoodAvgPrices.map(
        (price) => `$${parseFloat(price).toFixed(2).toLocaleString("en-US")}`
      ),
      textposition: "auto",
      hoverinfo: "x+y",
      hovertemplate: "%{x}: $%{y:,.2f}<extra></extra>",
      showlegend: false,
    };

    // create trace
    const dcTrace = {
      x: dcLabels,
      y: dcAvgPrices,
      type: "bar",
      marker: { color: dcColors, line: { color: "black", width: 1 } },
      text: dcAvgPrices.map(
        (price) => `$${parseFloat(price).toFixed(2).toLocaleString("en-US")}`
      ),
      textposition: "auto",
      hoverinfo: "x+y",
      hovertemplate: "%{x}: $%{y:,.2f}<extra></extra>",
      showlegend: false,
    };

    // dummy traces for the legend
    const legendTraces = getLegendTraces(colors, selectedNeighborhood);

    const layout = {
      title: `Average <b>Price by Property Type</b> Comparison:<br>Neighborhood <b>vs.</b> Washington, D.C.`,
      barmode: "group",
      xaxis: { title: "Property Type" },
      yaxis: { title: "Average Price ($)" },
      margin: { l: 50, r: 50, t: 100, b: 50 },
      legend: {
        x: 0.5,
        y: -0.3,
        xanchor: "center",
        yanchor: "top",
        orientation: "h",
      },
    };

    Plotly.newPlot(
      plotContainer,
      [neighborhoodTrace, dcTrace, ...legendTraces],
      layout
    );
  }
}

// plot minimum nights required for booking <= 32 nights
function plotMinimumNights(data, selectedNeighborhood, colors) {
  // get container and set data
  const plotContainer = document.getElementById("minimum-nights-plot");

  // run calculations for minimum nights required
  const minimumNights =
    selectedNeighborhood === "Washington, D.C."
      ? getMinimumNights(data)
      : getMinimumNights(
          filterListingsByNeighborhood(data, selectedNeighborhood)
        );

  // declare variables
  let labels, counts, title, barColors;

  // assign data to variables
  labels = Object.keys(minimumNights);
  counts = Object.values(minimumNights);
  title = `Number of Airbnb's per<br><b>Minimum Nights</b> Required for Booking<br>${selectedNeighborhood}`;
  barColors = labels.map((label) =>
    selectedNeighborhood === "Washington, D.C."
      ? colors.cityColor
      : colors.neighborhoodColor
  );

  // convert counts to formatted strings for hover template
  localeCounts = counts.map((count) => count.toLocaleString());

  // create trace
  const trace = {
    x: labels,
    y: counts,
    type: "bar",
    marker: { color: barColors, line: { color: "black", width: 1 } },
    // text: counts.map((count) => count.toLocaleString()),
    // textposition: "auto",
    hoverinfo: "x+y",
    hovertemplate:
      "Minimum Nights required for booking: %{x}<br>Number of Airbnb's: %{customdata}<extra></extra>",
    customdata: localeCounts,
  };

  const layout = {
    title: title,
    showlegend: false,
    xaxis: { title: { text: "Minimum Nights", standoff: 10 }, range: [0, 33] },
    yaxis: { title: "Count" },
    margin: { l: 50, r: 50, t: 100, b: 50 },
    shapes: [
      {
        type: "line",
        x0: 30,
        y0: 0,
        x1: 30,
        y1: Math.max(...counts),
        line: {
          color: "red",
          width: 2,
          dash: "dot",
        },
      },
    ],
    annotations: [
      {
        x: 30,
        y: Math.max(...counts),
        xref: "x",
        yref: "y",
        text: "<b style='color: red;'>30 days<br>The legal Short Term Rental threshold</b>",
        showarrow: true,
        arrowhead: 2,
        ax: 0,
        ay: -40,
        xanchor: "right",
      },
    ],
  };

  // plot the data
  Plotly.newPlot(plotContainer, [trace], layout);
}

// plot number of airbnbs per host, binned by number of listings, with 10+ listings as one bin
function plotHostAirbnbs(data, selectedNeighborhood, colors) {
  // get container and set data
  const plotContainer = document.getElementById("host-number-of-airbnbs-plot");

  // run calculations for number of listings per host
  const hostAirbnbs =
    selectedNeighborhood === "Washington, D.C."
      ? getHostAirbnbs(data)
      : getHostAirbnbs(
          filterListingsByNeighborhood(data, selectedNeighborhood)
        );

  // declare variables
  let labels, counts, title, barColors;

  // assign data to variables
  labels = Object.keys(hostAirbnbs);
  counts = Object.values(hostAirbnbs);
  title = `Number of <b>Airbnb's per Host</b><br>${selectedNeighborhood}`;
  barColors = labels.map((label) =>
    selectedNeighborhood === "Washington, D.C."
      ? colors.cityColor
      : colors.neighborhoodColor
  );

  // convert counts to formatted strings for hover template
  localeCounts = counts.map((count) => count.toLocaleString());

  // create trace
  const trace = {
    x: labels,
    y: counts,
    type: "bar",
    marker: { color: barColors, line: { color: "black", width: 1 } },
    text: counts.map((count) => count.toLocaleString()),
    textposition: "auto",
    hoverinfo: "x+y",
    hovertemplate:
      "Number of Listings per Host: %{x}<br>Number of Airbnb's: %{customdata}<extra></extra>",
    customdata: localeCounts,
  };

  const layout = {
    title: title,
    showlegend: false,
    xaxis: {
      title: { text: "Number of Listings per Host", standoff: 10 },
      type: "category",
    },
    yaxis: { title: "Count" },
    margin: { l: 50, r: 50, t: 100, b: 50 },
  };

  // plot the data
  Plotly.newPlot(plotContainer, [trace], layout);
}

// show top 10 hosts with the most listings using Plotly table
function plotTop20Hosts(data) {
  const topHosts = getTopHosts(data);
  const topHostsContainer = document.getElementById("top-20-hosts-table");

  // clear previous content
  topHostsContainer.innerHTML = "";

  // extract headers and values
  const headers = ["Host Name", "Number of Airbnb's"];
  const rows = topHosts.map((host) => [host.host_name, host.count]);

  // transpose rows to columns for Plotly
  const columns = headers.map((_, colIndex) =>
    rows.map((row) => row[colIndex])
  );

  // create trace
  const trace = {
    type: "table",
    header: {
      values: headers,
      align: "left",
      line: { width: 1, color: "black" },
      fill: { color: "paleturquoise" },
      font: { family: "Arial", size: 12, color: "black" },
    },
    cells: {
      values: columns,
      align: "left",
      line: { width: 1, color: "black" },
      fill: { color: "lavender" },
      font: { family: "Arial", size: 11, color: ["black"] },
    },
  };

  // create layout
  const layout = {
    title: "<b>Top Hosts</b> with the Most Listings",
    margin: { t: 50, l: 25, r: 25, b: 25 },
  };

  // plot chart
  Plotly.newPlot(topHostsContainer, [trace], layout);
}

// plot median price per neighborhood with highlighted DC and selected neighborhood
function plotMedianPricePerNeighborhood(
  listingsData,
  selectedNeighborhood,
  colors
) {
  // Calculate median price per neighborhood
  const medianPrices = calculateMedianPricePerNeighborhood(listingsData);

  // get median price for all of DC, add to medianPrices object
  const dcMedianPrice = calculateStats(listingsData).medianPrice;
  medianPrices["Washington, D.C."] = dcMedianPrice;

  // convert medianPrices object to an array, then sort
  const sortedNeighborhoods = Object.keys(medianPrices)
    .map((neighborhood) => ({
      neighborhood: neighborhood,
      medianPrice: medianPrices[neighborhood],
    }))
    .sort((a, b) => a.medianPrice - b.medianPrice);

  // map x and y data for all neighborhoods, and shorten names
  const neighborhoods = sortedNeighborhoods.map((d) =>
    shortenName(d.neighborhood)
  );
  const prices = sortedNeighborhoods.map((d) => d.medianPrice);

  // get the index of DC and selected neighborhood
  const dcIndex = neighborhoods.findIndex(
    (n) => n === shortenName("Washington, D.C.")
  );
  const selectedIndex = neighborhoods.findIndex(
    (n) => n === shortenName(selectedNeighborhood)
  );

  // highlight selected neighborhood and DC, gray out the rest
  const colorsArray = neighborhoods.map((n, index) =>
    index === dcIndex
      ? colors.cityColor
      : index === selectedIndex
      ? colors.neighborhoodColor
      : colors.defaultGray
  );

  // dim the non-highlighted bars
  const opacityArray = neighborhoods.map((n, index) =>
    index === dcIndex || index === selectedIndex ? 1 : 0.3
  );

  // create trace
  const trace = {
    x: prices,
    y: neighborhoods,
    type: "bar",
    orientation: "h",
    marker: {
      color: colorsArray,
      opacity: opacityArray,
      line: {
        color: "black",
        width: neighborhoods.map((n, index) =>
          index === dcIndex || index === selectedIndex ? 2 : 0.5
        ),
      },
    },
    hovertemplate: "%{y}: $%{x:.2f}<extra></extra>",
  };

  // create layout
  const layout = {
    title: `<b>Median Price</b> by Neighborhood`,
    xaxis: {
      title: "Median Price ($)",
    },
    yaxis: {
      title: "Neighborhood",
      // automargin: true, // ensures neighborhood names don't get cut off
    },
    hovermode: "y unified",
    margin: {
      l: 125, // adjust to fit long neighborhood names
    },
  };

  // plot the chart
  Plotly.newPlot("median-price-plot", [trace], layout);
}

// shorten long neighborhood names with '...'
function shortenName(name, maxLength = 15) {
  return name.length > maxLength ? name.slice(0, maxLength - 3) + "..." : name;
}
