DROP INDEX IF EXISTS idx_listings_quarter;
DROP INDEX IF EXISTS idx_listings_neighborhood;
DROP INDEX IF EXISTS idx_listings_id;
DROP INDEX IF EXISTS idx_listings_host;
DROP INDEX IF EXISTS idx_listings_commercial;

DROP VIEW IF EXISTS host_structure_trends;
DROP VIEW IF EXISTS neighborhood_trends;
DROP VIEW IF EXISTS quarterly_market_summary;
DROP VIEW IF EXISTS listing_persistence;

DROP TABLE IF EXISTS neighborhood_population;
DROP TABLE IF EXISTS reviews_summary;
DROP TABLE IF EXISTS calendar_summary;
DROP TABLE IF EXISTS listings_long;

CREATE TABLE listings_long (
    listing_id BIGINT,
    host_id BIGINT,
    quarter TEXT,
    quarter_index INT,

    neighborhood TEXT,
    latitude FLOAT,
    longitude FLOAT,

    price DECIMAL,
    room_type TEXT,
    minimum_nights INT,
    availability_365 INT,

    calculated_host_listings_count INT,
    license TEXT,

    is_entire_home BOOLEAN,
    is_multi_listing_host BOOLEAN,
    is_high_availability BOOLEAN,
    likely_commercial BOOLEAN,

    PRIMARY KEY (listing_id, quarter)
);

CREATE TABLE calendar_summary (
    listing_id BIGINT,
    quarter TEXT,
    quarter_index INT,

    mean_available_days NUMERIC,
    pct_days_available NUMERIC,
    max_consecutive_available_days NUMERIC,

    PRIMARY KEY (listing_id, quarter)
);

CREATE TABLE reviews_summary (
    listing_id BIGINT,
    quarter TEXT,
    quarter_index INT,

    reviews_count INT,
    reviews_count_ltm INT,
    reviews_count_l30d INT,
    reviews_per_month NUMERIC,

    first_review DATE,
    last_review DATE,

    PRIMARY KEY (listing_id, quarter)
);

CREATE TABLE neighborhood_population (
    neighborhood TEXT PRIMARY KEY,
    total_population INT,
    total_housing_units INT
);

CREATE VIEW listing_persistence AS
SELECT
    listing_id,
    MIN(quarter_index) AS first_seen_q,
    MAX(quarter_index) AS last_seen_q,
    COUNT(*) AS quarters_present,
    (COUNT(*) >= 4) AS is_persistent
FROM listings_long
GROUP BY listing_id;

CREATE VIEW quarterly_market_summary AS
SELECT
    quarter,
    quarter_index,
    COUNT(*) AS listings_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
    AVG(price) AS mean_price,
    AVG(CASE WHEN license = 'Licensed' THEN 1 ELSE 0 END) AS license_rate,
    AVG(likely_commercial::int) AS commercial_share
FROM listings_long
GROUP BY quarter, quarter_index
ORDER BY quarter_index;

CREATE VIEW neighborhood_trends AS
SELECT
    neighborhood,
    quarter,
    quarter_index,
    COUNT(*) AS listings_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
    AVG(likely_commercial::int) AS commercial_share,
    AVG(CASE WHEN license = 'Licensed' THEN 1 ELSE 0 END) AS license_rate
FROM listings_long
GROUP BY neighborhood, quarter, quarter_index;

CREATE VIEW host_structure_trends AS
SELECT
    quarter,
    quarter_index,
    CASE
        WHEN is_multi_listing_host THEN 'Multi-listing'
        ELSE 'Single-listing'
    END AS host_type,
    COUNT(*) AS listings_count,
    AVG(price) AS avg_price,
    AVG(availability_365) AS avg_availability
FROM listings_long
GROUP BY quarter, quarter_index, host_type;

CREATE INDEX idx_listings_quarter ON listings_long (quarter_index);
CREATE INDEX idx_listings_neighborhood ON listings_long (neighborhood);
CREATE INDEX idx_listings_id ON listings_long (listing_id);
CREATE INDEX idx_listings_host ON listings_long (host_id);
CREATE INDEX idx_listings_commercial ON listings_long (likely_commercial);
