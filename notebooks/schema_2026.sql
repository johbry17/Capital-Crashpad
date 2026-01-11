DROP TABLE IF EXISTS listings_long;

CREATE TABLE listings_long (
    listing_id BIGINT,
    host_id BIGINT,
    quarter TEXT,
    quarter_index INT,
    neighbourhood TEXT,
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
