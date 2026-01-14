// Description: Utility functions for data processing and analysis

// filter listings by neighborhood
function filterListingsByNeighborhood(listingsData, selectedNeighborhood) {
  return listingsData.filter(
    (listing) => listing.neighbourhood === selectedNeighborhood
  );
}

// calculate stats for data, filter out NaN values
function calculateStats(data) {
  const prices = data
    .map((listing) => parseFloat(listing.price))
    .filter((price) => !isNaN(price));
  const ratings = data
    .filter((listing) => listing.review_scores_rating !== null)
    .map((listing) => parseFloat(listing.review_scores_rating))
    .filter((rating) => !isNaN(rating));

  return {
    meanPrice: calculateMean(prices),
    medianPrice: calculateMedian(prices),
    meanRating: calculateMean(ratings),
    medianRating: calculateMedian(ratings),
  };
}

// calculate mean
function calculateMean(data) {
  return data.reduce((sum, value) => sum + value, 0) / data.length;
}

// calculate median
function calculateMedian(data) {
  const sortedData = data.sort((a, b) => a - b);
  const mid = Math.floor(sortedData.length / 2);
  return sortedData.length % 2 === 0
    ? (sortedData[mid - 1] + sortedData[mid]) / 2
    : sortedData[mid];
}

// type conversion
function numericPrices(listings) {
  return listings.map((d) => Number(d.price)).filter((v) => Number.isFinite(v));
}

function boxPlotStats(values) {
  const v = values.slice().sort((a, b) => a - b);

  const q = (p) => {
    const i = (v.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return lo === hi ? v[lo] : v[lo] + (v[hi] - v[lo]) * (i - lo);
  };

  const q1 = q(0.25);
  const median = q(0.5);
  const q3 = q(0.75);
  const iqr = q3 - q1;

  return {
    min: v[0],
    q1,
    median,
    q3,
    max: v[v.length - 1],
    lowerFence: Math.max(v[0], q1 - 1.5 * iqr),
    upperFence: Math.min(v[v.length - 1], q3 + 1.5 * iqr),
  };
}

// // calculate average price per neighborhood
// function calculateAveragePricePerNeighborhood(data) {
//   const neighborhoodPrices = {};

//   data.forEach((listing) => {
//     const neighborhood = listing.neighbourhood;
//     const price = parseFloat(listing.price);

//     if (!neighborhoodPrices[neighborhood]) {
//       neighborhoodPrices[neighborhood] = { total: 0, count: 0 };
//     }

//     neighborhoodPrices[neighborhood].total += price;
//     neighborhoodPrices[neighborhood].count += 1;
//   });

//   const averagePrices = {};
//   for (const neighborhood in neighborhoodPrices) {
//     averagePrices[neighborhood] =
//       neighborhoodPrices[neighborhood].total /
//       neighborhoodPrices[neighborhood].count;
//   }

//   return averagePrices;
// }

// calculate number of listings per neighborhood
function calculateAirbnbCountsPerNeighborhood(data) {
  const neighborhoodCounts = {};

  data.forEach((listing) => {
    const neighborhood = listing.neighbourhood;
    neighborhoodCounts[neighborhood] = neighborhoodCounts[neighborhood]
      ? neighborhoodCounts[neighborhood] + 1
      : 1;
  });

  return neighborhoodCounts;
}

// label each license status
function setLicenseStatus(data) {
  return data.map((item) => {
    let license = item.license
      ? item.license.split(":")[0].trim()
      : "No License";
    switch (license.toLowerCase()) {
      case "hosted license":
      case "unhosted license":
        return { ...item, licenseCategory: "Licensed" };
      case "exempt":
        return { ...item, licenseCategory: "Exempt" };
      default:
        return { ...item, licenseCategory: "No License" };
    }
  });
}

// aggregate by category, get percent of total for each license category
function getLicensePercentage(data) {
  let total = data.length;
  let distribution = {
    Licensed: 0,
    Exempt: 0,
    "No License": 0,
  };

  // aggregate each category
  data.forEach((item) => {
    distribution[item.licenseCategory]++;
  });

  // add percentage to each category
  let percentageDistribution = {};
  for (let key in distribution) {
    percentageDistribution[key] = {
      count: distribution[key],
      percent: ((distribution[key] / total) * 100).toFixed(1),
    };
  }

  return percentageDistribution;
}

// calculate total and percentage for each room_type
function getPropertyTypePercentage(data) {
  let total = data.length;
  let distribution = {};

  // count each room_type
  data.forEach((item) => {
    let roomType = item.room_type;
    distribution[roomType] = distribution[roomType]
      ? distribution[roomType] + 1
      : 1;
  });

  // add percentage to each room_type
  let percentageDistribution = {};
  for (let key in distribution) {
    percentageDistribution[key] = {
      count: distribution[key],
      percent: ((distribution[key] / total) * 100).toFixed(1),
    };
  }

  return percentageDistribution;
}

// calculate average price per license category
function getAveragePriceByLicense(data) {
  let totalCount = {
    Licensed: 0,
    Exempt: 0,
    "No License": 0,
  };

  let totalSum = {
    Licensed: 0,
    Exempt: 0,
    "No License": 0,
  };

  // aggregate price and count by category
  data.forEach((item) => {
    let price = parseFloat(item.price) || 0; // Ensure price is a valid number
    totalSum[item.licenseCategory] += price;
    if (price > 0) {
      totalCount[item.licenseCategory]++;
    }
  });

  // calculate average price for each category
  let averagePriceDistribution = {};
  for (let key in totalSum) {
    averagePriceDistribution[key] = {
      count: totalCount[key],
      avgPrice:
        totalCount[key] > 0 ? (totalSum[key] / totalCount[key]).toFixed(2) : 0,
    };
  }

  return averagePriceDistribution;
}

// calculate average price per room_type
function getPropertyTypePrice(data) {
  let totalSum = {};
  let totalCount = {};

  // aggregate price and count by room_type
  data.forEach((item) => {
    let price = parseFloat(item.price) || 0;
    totalSum[item.room_type] = totalSum[item.room_type]
      ? totalSum[item.room_type] + price
      : price;
    totalCount[item.room_type] = totalCount[item.room_type]
      ? totalCount[item.room_type] + 1
      : 1;
  });

  // calculate average price for each room_type
  let averagePriceDistribution = {};
  for (let key in totalSum) {
    averagePriceDistribution[key] = {
      count: totalCount[key],
      avgPrice:
        totalCount[key] > 0 ? (totalSum[key] / totalCount[key]).toFixed(2) : 0,
    };
  }

  return averagePriceDistribution;
}

// calculate number of listings per minimum nights required for booking <= 32
function getMinimumNights(data) {
  let distribution = {};

  // filter out listings with minimum_nights > 32
  data = data.filter((item) => item.minimum_nights <= 32);

  // count for each minimum_nights bin
  data.forEach((item) => {
    distribution[item.minimum_nights] = distribution[item.minimum_nights]
      ? distribution[item.minimum_nights] + 1
      : 1;
  });

  return distribution;
}

// calculate the count and percent of listings with minimum nights exactly 31 days
function getListingsAt31Days(data) {
  const totalListings = data.length;
  const listingsAt31Days = data.filter((item) => item.minimum_nights == 31);
  const countAt31Days = listingsAt31Days.length;

  // calculate percent
  const percentAt31Days = ((countAt31Days / totalListings) * 100).toFixed(2);

  return { countAt31Days, percentAt31Days };
}

// calculate the number of listings per host with multiple properties
function getMultiPropertyData(data) {
  const totalListings = data.length;

  // get the distribution of listings per host
  const distribution = getHostAirbnbs(data);

  // sum count of listings for hosts with multiple properties (2 or more)
  const multiPropertyListings = Object.entries(distribution)
    .filter(([key, value]) => key >= 2 || key === "10+")
    .reduce((sum, [, value]) => sum + value, 0);

  // calculate percent
  const percentMultiProperties = (
    (multiPropertyListings / totalListings) *
    100
  ).toFixed(2);

  return { multiPropertyListings, totalListings, percentMultiProperties };
}

// calculate number of airbnbs per host, binned by number of listings, with 10+ listings as one bin
function getHostAirbnbs(data) {
  let hostCounts = {};
  let distribution = {};

  // count the number of listings per host
  data.forEach((item) => {
    hostCounts[item.host_id] = hostCounts[item.host_id]
      ? hostCounts[item.host_id] + 1
      : 1;
  });

  // create bins for number of listings
  const labels = [...Array(10).keys()].map(String).concat(["10+"]);

  // initialize distribution with labels
  labels.forEach((label) => (distribution[label] = 0));

  // bin the hosts based on the number of listings and sum counts
  Object.values(hostCounts).forEach((count) => {
    let bin = count >= 10 ? "10+" : String(count);
    distribution[bin] += count;
  });

  return distribution;
}

// get top 20 hosts with the most listings
function getTopHosts(data) {
  let hostCounts = {};

  // count the number of listings per host and include host_name
  data.forEach((item) => {
    if (hostCounts[item.host_id]) {
      hostCounts[item.host_id].count += 1;
    } else {
      hostCounts[item.host_id] = { name: item.host_name, count: 1 };
    }
  });

  // sort the hosts by number of listings
  const sortedHosts = Object.entries(hostCounts).sort(
    (a, b) => b[1].count - a[1].count
  );

  // get the top 20 hosts
  return sortedHosts
    .slice(0, 20)
    .map(([host_id, { name, count }]) => ({ host_id, host_name: name, count }));
}

// calculate median price per neighborhood
function calculateMedianPricePerNeighborhood(data) {
  const neighborhoodPrices = {};

  data.forEach((listing) => {
    const neighborhood = listing.neighbourhood;
    const price = parseFloat(listing.price);

    if (!neighborhoodPrices[neighborhood]) {
      neighborhoodPrices[neighborhood] = [];
    }

    // collect all prices
    neighborhoodPrices[neighborhood].push(price);
  });

  const medianPrices = {};
  for (const neighborhood in neighborhoodPrices) {
    // sort prices
    const prices = neighborhoodPrices[neighborhood].sort((a, b) => a - b);

    const middle = Math.floor(prices.length / 2);

    // calculate median (if even number of elements, take the average of the middle two)
    medianPrices[neighborhood] =
      prices.length % 2 !== 0
        ? prices[middle] // odd number of prices
        : (prices[middle - 1] + prices[middle]) / 2; // even number of prices
  }

  return medianPrices;
}
