DROP INDEX IF EXISTS idx_listings_quarter;
DROP INDEX IF EXISTS idx_listings_neighborhood;
DROP INDEX IF EXISTS idx_listings_id;
DROP INDEX IF EXISTS idx_listings_host;
DROP INDEX IF EXISTS idx_listings_commercial;

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

CREATE OR REPLACE VIEW listing_presence AS
SELECT
    listing_id,
    MIN(quarter_index) AS first_seen_q,
    MAX(quarter_index) AS last_seen_q,
    COUNT(*) AS quarters_present,
    (COUNT(*) >= 4) AS is_persistent
FROM listings_long
GROUP BY listing_id;

CREATE INDEX idx_listings_quarter ON listings_long (quarter_index);
CREATE INDEX idx_listings_neighborhood ON listings_long (neighborhood);
CREATE INDEX idx_listings_id ON listings_long (listing_id);
CREATE INDEX idx_listings_host ON listings_long (host_id);
CREATE INDEX idx_listings_commercial ON listings_long (likely_commercial);
