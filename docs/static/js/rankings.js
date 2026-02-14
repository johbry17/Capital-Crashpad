// Description: This file contains functions to initialize and render the rankings table based on the selected metric and neighborhood.

// globals to store rankings data and DC baseline for relative metrics
let rankingsData = [];
let dcBaseline = {};

// initialize rankings data and DC baseline
function initializeRankings(data) {
  rankingsData = data;
  dcBaseline = data.find((d) => d.neighborhood === "Washington, D.C.");

  // minor data cleanup (all other rankingsData is pre-processed in Python)
  // compute DC baseline for total_listings as average of all neighborhoods
  dcBaseline.total_listings =
    rankingsData["Washington, D.C."].total_listings / (rankingsData.length - 1);
}

// render rankings table based on selected metric and neighborhood
function renderRankings(metric, isRelative, selectedNeighborhood) {
  const container = d3.select("#rankings-container");

  // resolve metric key based on whether relative mode is toggled
  const resolved = resolveMetric(metric);

  // prepare data: filter out DC, convert values to numbers, sort by pre-computed rank
  const rankKey = metric + "_rank";
  const neighborhoods = rankingsData
    .filter((d) => d.neighborhood !== "Washington, D.C.")
    .map((d) => ({
      ...d,
      value: +d[resolved], // ensure number
      rank: +d[rankKey], // ensure number
    }));

  // sort neighborhoods by rank (ascending) for rendering
  neighborhoods.sort((a, b) => a.rank - b.rank);

  // compute scale for bar widths based on min/max values in the current metric
  const values = neighborhoods.map((d) => d.value);
  const max = d3.max(values);
  const min = d3.min(values);

  // set diverging or sequential scale based on relative vs absolute mode
  const scale = isRelative
    ? d3.scaleLinear().domain([min, 0, max]).range([0, 50, 100])
    : d3.scaleLinear().domain([0, max]).range([0, 100]);

  // bind data to rows by neighborhood name (unique identifier) for efficient re-rendering
  const rows = container
    .selectAll(".rank-row")
    .data(neighborhoods, (d) => d.neighborhood);
  // remove old rows that are no longer in the data
  rows.exit().remove();

  // create new rows
  const rowsEnter = rows.enter().append("div").attr("class", "rank-row");
  rowsEnter.append("div").attr("class", "rank-col");
  rowsEnter.append("div").attr("class", "name-col");

  // create bar column with track, zero line, bar, and value label
  const barCol = rowsEnter.append("div").attr("class", "bar-col");
  barCol.append("div").attr("class", "bar-track");
  barCol.append("div").attr("class", "bar-zero-line");
  barCol.append("div").attr("class", "bar");
  barCol.append("span").attr("class", "value-label");

  // merge new and existing rows for update
  const rowsMerge = rowsEnter.merge(rows);

  // order rows by rank (dynamic reordering based on current metric)
  rowsMerge.order();

  // highlight selected neighborhood
  rowsMerge.classed("selected", (d) => d.neighborhood === selectedNeighborhood);

  // update rank, name, and value label for all rows
  rowsMerge.select(".rank-col").text((d) => d.rank);
  rowsMerge.select(".name-col").text((d) => d.neighborhood);
  rowsMerge.select(".value-label").text((d) => formatMetric(resolved, d.value));

  // update bar widths and positions based on metric values and relative vs absolute mode
  rowsMerge.each(function (d) {
    const row = d3.select(this);
    const bar = row.select(".bar");
    const zeroLine = row.select(".bar-zero-line");

    // handle relative mode with diverging bars
    if (isRelative) {
      // show zero line in relative mode to separate positive vs negative values
      zeroLine.style("display", "block");

      // position bars based on whether value is positive or negative
      const center = 50;
      const scaled = scale(d.value);

      // if value is positive, bar grows to the right of center; if negative, bar grows to the left
      if (d.value >= 0) {
        bar
          .attr("class", "bar positive")
          .style("left", center + "%")
          .style("width", scaled - center + "%");
      } else {
        bar
          .attr("class", "bar negative")
          .style("left", scaled + "%")
          .style("width", center - scaled + "%");
      }
      // absolute mode with sequential bars
    } else {
      // hide diverging zero line
      zeroLine.style("display", "none");

      bar
        .attr("class", "bar absolute")
        .style("left", "0%")
        .style("width", scale(d.value) + "%");
    }
  });

  // remove existing DC reference line and label
  container.selectAll(".dc-ref-line, .dc-ref-label").remove();

  // add reference line for DC baseline if in absolute mode
  if (!isRelative && dcBaseline) {
    const dcValue = dcBaseline[resolved];

    // determine where DC would rank in the sorted neighborhoods
    const sortedValues = neighborhoods.map((d) => d.value);
    let dcRankIndex = sortedValues.findIndex((v) => v < dcValue);

    // if DC value is worse than all neighborhoods, place at end of list
    if (dcRankIndex === -1) {
      dcRankIndex = sortedValues.length;
    }

    // place reference line at appropriate position based on computed rank index and row heights
    const firstRow = container.select(".rank-row").node();
    if (firstRow) {
      // get row height, compute top position, subtract 1px to center the 2px line on the boundary between rows
      const rowHeight = firstRow.offsetHeight;
      const topPx = rowHeight * dcRankIndex - 1;

      // add reference line at computed position
      const ref = container
        .append("div")
        .attr("class", "dc-ref-line")
        .style("top", topPx + "px");

      // add value label
      container
        .append("div")
        .attr("class", "dc-ref-label")
        .style("top", topPx - 10 + "px")
        .text(`DC: ${formatMetric(resolved, dcValue)}`);
    }
  }
}
