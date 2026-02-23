from django.db import models

# Create your models here.
# recreating the database schema from PostgreSQL
# the only exception is the 'minimum_nights' field in the 'Listing' model
# which comes from MinMaxNight instead of Listing in PostgreSQL
# it was throwing a decimal.InvalidOperation error when pulled from MinMaxNight...
# ...for obscure reasons known only to the Gods of Misery and Despair and Endless Coding Frustration
# see views.py

class Host(models.Model):
    host_id = models.BigAutoField(primary_key=True)
    host_url = models.TextField()
    host_name = models.TextField()
    host_since = models.DateField()
    host_location = models.TextField(null=True, blank=True)
    host_about = models.TextField(null=True, blank=True)
    host_response_time = models.TextField(null=True, blank=True)
    host_response_rate = models.FloatField(null=True, blank=True)
    host_acceptance_rate = models.FloatField(null=True, blank=True)
    host_is_superhost = models.BooleanField()
    host_thumbnail_url = models.TextField()
    host_picture_url = models.TextField()
    host_neighbourhood = models.TextField(null=True, blank=True)
    host_listings_count = models.IntegerField()
    host_total_listings_count = models.IntegerField()
    host_verifications = models.TextField()
    host_has_profile_pic = models.BooleanField()
    host_identity_verified = models.BooleanField()

class HostListingsCount(models.Model):
    host = models.OneToOneField(Host, on_delete=models.CASCADE, primary_key=True)
    host_listings_total_count = models.IntegerField()
    host_listings_entire_homes_count = models.IntegerField()
    host_listings_private_rooms_count = models.IntegerField()
    host_listings_shared_rooms_count = models.IntegerField()

class Neighbourhood(models.Model):
    neighbourhood_id = models.AutoField(primary_key=True)
    neighbourhood = models.TextField()

class Listing(models.Model):
    listing_id = models.BigAutoField(primary_key=True)
    host = models.ForeignKey(Host, on_delete=models.CASCADE)
    neighbourhood = models.ForeignKey(Neighbourhood, on_delete=models.CASCADE)
    latitude = models.FloatField()
    longitude = models.FloatField()
    accommodates = models.IntegerField()
    bathrooms = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bedrooms = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    beds = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # the only exception to the PostgreSQL schema
    minimum_nights = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

class ListingCategorical(models.Model):
    listing = models.OneToOneField(Listing, on_delete=models.CASCADE, primary_key=True)
    listing_name = models.TextField()
    hover_description = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    listing_url = models.TextField()
    neighborhood_overview = models.TextField(null=True, blank=True)
    picture_url = models.TextField()
    property_type = models.TextField()
    room_type = models.TextField()
    amenities = models.TextField()
    bathrooms_text = models.TextField(null=True, blank=True)
    license = models.TextField(null=True, blank=True)

class Availability(models.Model):
    listing = models.OneToOneField(Listing, on_delete=models.CASCADE, primary_key=True)
    has_availability = models.BooleanField()
    availability_30 = models.IntegerField()
    availability_60 = models.IntegerField()
    availability_90 = models.IntegerField()
    availability_365 = models.IntegerField()
    calendar_last_scraped = models.DateField()
    instant_bookable = models.BooleanField()

class MinMaxNight(models.Model):
    listing = models.OneToOneField(Listing, on_delete=models.CASCADE, primary_key=True)
    minimum_nights = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    maximum_nights = models.DecimalField(max_digits=5, decimal_places=2)
    minimum_minimum_nights = models.DecimalField(max_digits=5, decimal_places=2)
    maximum_minimum_nights = models.DecimalField(max_digits=5, decimal_places=2)
    minimum_maximum_nights = models.DecimalField(max_digits=5, decimal_places=2)
    maximum_maximum_nights = models.DecimalField(max_digits=5, decimal_places=2)
    minimum_nights_avg_ntm = models.DecimalField(max_digits=5, decimal_places=2)
    maximum_nights_avg_ntm = models.DecimalField(max_digits=5, decimal_places=2)

class ListingReviews(models.Model):
    listing = models.OneToOneField(Listing, on_delete=models.CASCADE, primary_key=True)
    number_of_reviews = models.IntegerField()
    number_of_reviews_ltm = models.IntegerField()
    number_of_reviews_l30d = models.IntegerField()
    first_review = models.DateField(null=True, blank=True)
    last_review = models.DateField(null=True, blank=True)
    review_scores_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    review_scores_accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    review_scores_cleanliness = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    review_scores_checkin = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    review_scores_communication = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    review_scores_location = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    reviews_per_month = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    review_scores_value = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

class Review(models.Model):
    review_id = models.BigAutoField(primary_key=True)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    review_date = models.DateField()
    reviewer_id = models.BigIntegerField()
    reviewer_name = models.TextField(null=True, blank=True)
    review_comments = models.TextField(null=True, blank=True)

class Calendar(models.Model):
    id = models.AutoField(primary_key=True)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    date = models.DateField()
    available = models.BooleanField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    minimum_nights = models.IntegerField()
    maximum_nights = models.IntegerField()
