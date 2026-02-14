// // Description: JavaScript file for creating plots using Plotly.js

// //resizePlots();
// function resizePlots() {
//   const plotIds = [
//     "price-plot",
//     "ratings-plot",
//     "license-plot",
//     "license-price-plot",
//     "property-type-plot",
//     "property-type-price-plot",
//     "minimum-nights-plot",
//     "host-number-of-airbnbs-plot",
//     "top-20-hosts-table",
//     "median-price-plot",
//   ];

//   plotIds.forEach((id) => {
//     const container = document.getElementById(id);
//     if (container) {
//       const containerWidth = container.clientWidth;
//       const containerHeight = container.clientHeight;

//       // ensure dimensions are valid
//       if (containerWidth > 0 && containerHeight > 0) {
//         Plotly.relayout(container, {
//           width: containerWidth,
//           height: containerHeight,
//         });
//       }
//     }
//   });
// }
