ANALYZE hosts;
ANALYZE host_listings_count;
ANALYZE neighbourhoods;
ANALYZE listings;
ANALYZE listings_categorical;
ANALYZE availability;
ANALYZE min_max_night;
ANALYZE listing_reviews;
ANALYZE reviews;
ANALYZE calendar;

REINDEX TABLE hosts;
REINDEX TABLE host_listings_count;
REINDEX TABLE neighbourhoods;
REINDEX TABLE listings;
REINDEX TABLE listings_categorical;
REINDEX TABLE availability;
REINDEX TABLE min_max_night;
REINDEX TABLE listing_reviews;
REINDEX TABLE reviews;
REINDEX TABLE calendar;

REINDEX INDEX idx_host_id;
REINDEX INDEX idx_neighbourhood_id;
REINDEX INDEX idx_lat_long;
