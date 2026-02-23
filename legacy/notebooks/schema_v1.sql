-- drop min/max night? availability? reviews? calendar?
-- move number_of_reviews into listings?
-- additional indexes on price, review_scores_rating, etc.?

DROP INDEX IF EXISTS idx_lat_long;
DROP INDEX IF EXISTS idx_neighbourhood_id;
DROP INDEX IF EXISTS idx_host_id;
DROP VIEW IF EXISTS price_availability;
DROP VIEW IF EXISTS map_listings;
DROP TABLE IF EXISTS metadata;
DROP TABLE IF EXISTS calendar;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS listing_reviews;
DROP TABLE IF EXISTS min_max_night;
DROP TABLE IF EXISTS availability;
DROP TABLE IF EXISTS listings_categorical;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS neighbourhoods;
DROP TABLE IF EXISTS host_listings_count;
DROP TABLE IF EXISTS hosts;

CREATE TABLE "hosts" (
    "host_id" BIGINT   NOT NULL,
    "host_url" TEXT   NOT NULL,
    "host_name" TEXT   NOT NULL,
    "host_since" DATE   NOT NULL,
    "host_location" TEXT,
    "host_about" TEXT,
    "host_response_time" TEXT,
    "host_response_rate" FLOAT,
    "host_acceptance_rate" FLOAT,
    "host_is_superhost" BOOLEAN   NOT NULL,
    "host_thumbnail_url" TEXT   NOT NULL,
    "host_picture_url" TEXT   NOT NULL,
    "host_neighbourhood" TEXT,
    "host_listings_count" INT   NOT NULL,
    "host_total_listings_count" INT   NOT NULL,
    "host_verifications" TEXT   NOT NULL,
    "host_has_profile_pic" BOOLEAN   NOT NULL,
    "host_identity_verified" BOOLEAN   NOT NULL,
    CONSTRAINT "pk_hosts" PRIMARY KEY (
        "host_id"
     )
);

CREATE TABLE "host_listings_count" (
    "host_id" BIGINT   NOT NULL,
    "host_listings_total_count" INT   NOT NULL,
    "host_listings_entire_homes_count" INT   NOT NULL,
    "host_listings_private_rooms_count" INT   NOT NULL,
    "host_listings_shared_rooms_count" INT   NOT NULL,
    CONSTRAINT "pk_host_listings_count" PRIMARY KEY (
        "host_id"
     )
);

CREATE TABLE "neighbourhoods" (
    "neighbourhood_id" serial   NOT NULL,
    "neighbourhood" TEXT   NOT NULL,
    CONSTRAINT "pk_neighbourhood" PRIMARY KEY (
        "neighbourhood_id"
     )
);

CREATE TABLE "listings" (
    "listing_id" BIGINT   NOT NULL,
    "host_id" int   NOT NULL,
    "neighbourhood_id" int   NOT NULL,
    "latitude" FLOAT   NOT NULL,
    "longitude" FLOAT   NOT NULL,
    "accommodates" INT   NOT NULL,
    "bathrooms" decimal,
    "bedrooms" decimal,
    "beds" decimal,
    "price" decimal  NOT NULL,
    CONSTRAINT "pk_listings" PRIMARY KEY (
        "listing_id"
     )
);

CREATE TABLE "listings_categorical" (
    "listing_id" bigint   NOT NULL,
    "listing_name" TEXT   NOT NULL,
    "hover_description" TEXT,
    "description" TEXT,
    "listing_url" TEXT   NOT NULL,
    "neighborhood_overview" TEXT,
    "picture_url" TEXT   NOT NULL,
    "property_type" TEXT   NOT NULL,
    "room_type" TEXT   NOT NULL,
    "amenities" TEXT   NOT NULL,
    "bathrooms_text" TEXT,
    "license" TEXT,
    CONSTRAINT "pk_listings_categorical" PRIMARY KEY (
        "listing_id"
     )
);

CREATE TABLE "availability" (
    "listing_id" BIGINT   NOT NULL,
    "has_availability" BOOLEAN   NOT NULL,
    "availability_30" INT   NOT NULL,
    "availability_60" INT   NOT NULL,
    "availability_90" INT   NOT NULL,
    "availability_365" INT   NOT NULL,
    "calendar_last_scraped" DATE   NOT NULL,
    "instant_bookable" BOOLEAN   NOT NULL,
    CONSTRAINT "pk_availability" PRIMARY KEY (
        "listing_id"
     )
);

CREATE TABLE "min_max_night" (
    "listing_id" BIGINT   NOT NULL,
    "minimum_nights" DECIMAL   NOT NULL,
    "maximum_nights" DECIMAL   NOT NULL,
    "minimum_minimum_nights" DECIMAL   NOT NULL,
    "maximum_minimum_nights" DECIMAL   NOT NULL,
    "minimum_maximum_nights" DECIMAL   NOT NULL,
    "maximum_maximum_nights" DECIMAL   NOT NULL,
    "minimum_nights_avg_ntm" DECIMAL   NOT NULL,
    "maximum_nights_avg_ntm" DECIMAL   NOT NULL,
    CONSTRAINT "pk_min_max_night" PRIMARY KEY (
        "listing_id"
     )
);

CREATE TABLE "listing_reviews" (
    "listing_id" BIGINT   NOT NULL,
    "number_of_reviews" INT   NOT NULL,
    "number_of_reviews_ltm" INT   NOT NULL,
    "number_of_reviews_l30d" INT   NOT NULL,
    "first_review" DATE,
    "last_review" DATE,
    "review_scores_rating" DECIMAL,
    "review_scores_accuracy" DECIMAL,
    "review_scores_cleanliness" DECIMAL,
    "review_scores_checkin" DECIMAL,
    "review_scores_communication" DECIMAL,
    "review_scores_location" DECIMAL,
    "reviews_per_month" DECIMAL,
    "review_scores_value" DECIMAL,
    CONSTRAINT "pk_listing_reviews" PRIMARY KEY (
        "listing_id"
     )
);

CREATE TABLE "reviews" (
	"review_id" BIGINT   NOT NULL,    
    "listing_id" BIGINT   NOT NULL,
    "review_date" DATE   NOT NULL,
    "reviewer_id" BIGINT   NOT NULL,
    "reviewer_name" TEXT,
    "review_comments" TEXT,
    CONSTRAINT "pk_reviews" PRIMARY KEY (
        "review_id"
     )
);

CREATE TABLE "calendar" (
    "id" serial   NOT NULL,
    "listing_id" BIGINT   NOT NULL,
    "date" DATE   NOT NULL,
    "available" BOOLEAN   NOT NULL,
    "price" decimal  NOT NULL,
    "minimum_nights" INT, -- removed NOT NULL for Mar 2025
    "maximum_nights" INT, -- removed NOT NULL for Mar 2025
    CONSTRAINT "pk_calendar" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

ALTER TABLE "host_listings_count" ADD CONSTRAINT "fk_host_listings_count_host_id" FOREIGN KEY("host_id")
REFERENCES "hosts" ("host_id");

ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_host_id" FOREIGN KEY("host_id")
REFERENCES "hosts" ("host_id");

ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_neighbourhood_id" FOREIGN KEY("neighbourhood_id")
REFERENCES "neighbourhoods" ("neighbourhood_id");

ALTER TABLE "listings_categorical" ADD CONSTRAINT "fk_listings_categorical_listing_id" FOREIGN KEY("listing_id")
REFERENCES "listings" ("listing_id");

ALTER TABLE "availability" ADD CONSTRAINT "fk_availability_listing_id" FOREIGN KEY("listing_id")
REFERENCES "listings" ("listing_id");

ALTER TABLE "min_max_night" ADD CONSTRAINT "fk_min_max_night_listing_id" FOREIGN KEY("listing_id")
REFERENCES "listings" ("listing_id");

ALTER TABLE "listing_reviews" ADD CONSTRAINT "fk_listing_reviews_listing_id" FOREIGN KEY("listing_id")
REFERENCES "listings" ("listing_id");

ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_listing_id" FOREIGN KEY("listing_id")
REFERENCES "listings" ("listing_id");

ALTER TABLE "calendar" ADD CONSTRAINT "fk_calendar_listing_id" FOREIGN KEY("listing_id")
REFERENCES "listings" ("listing_id");

CREATE VIEW map_listings AS
SELECT 
    l.listing_id,
    l.latitude,
    l.longitude,
    lc.hover_description,
    lc.listing_url,
    l.price,
    lc.property_type,
    lc.room_type,
    l.accommodates,
    lr.number_of_reviews,
    lr.number_of_reviews_ltm,
    lr.number_of_reviews_l30d,
    lr.first_review,
    lr.last_review,
    lr.review_scores_rating,
    lr.reviews_per_month,
    l.host_id,
    h.host_name,
    h.host_identity_verified,
    h.host_listings_count,
    h.host_total_listings_count,
    lc.license,
    n.neighbourhood,
    m.minimum_nights
FROM 
    listings l
JOIN 
    listings_categorical lc ON l.listing_id = lc.listing_id
JOIN 
    listing_reviews lr ON l.listing_id = lr.listing_id
JOIN 
    hosts h ON l.host_id = h.host_id
JOIN
    neighbourhoods n ON l.neighbourhood_id = n.neighbourhood_id
JOIN
    min_max_night m ON l.listing_id = m.listing_id;


CREATE VIEW price_availability AS
SELECT
    n.neighbourhood,
    c.date,
    AVG(c.price) FILTER (WHERE c.available = TRUE AND c.price <= 500) AS avg_price,
    COUNT(*) FILTER (WHERE c.available = TRUE AND c.price <= 500) AS available_listings
FROM
    calendar c
JOIN
    listings l ON c.listing_id = l.listing_id
JOIN
    neighbourhoods n ON l.neighbourhood_id = n.neighbourhood_id
GROUP BY GROUPING SETS (
    (n.neighbourhood, c.date),  
    (c.date)                  
)
ORDER BY
    n.neighbourhood, c.date;


CREATE INDEX idx_host_id ON listings(host_id);

CREATE INDEX idx_neighbourhood_id ON listings(neighbourhood_id);

CREATE INDEX idx_lat_long ON listings(latitude, longitude);


