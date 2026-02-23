from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import Avg, Count
from .models import Listing, Calendar, Host, Neighbourhood, ListingCategorical, MinMaxNight

# Create your views here.
def index(request):
    return render(request, 'index.html')

# recreate the PostgreSQL view 'SELECT * FROM map_listings' in Django
# the only exception is the 'minimum_nights' field in the 'Listing' model
# which comes from MinMaxNight instead of Listing in PostgreSQL
# it was throwing a decimal.InvalidOperation error when pulled from MinMaxNight...
# ...for obscure reasons known only to the Gods of Misery and Despair and Endless Coding Frustration
# see models.py
def get_listings(request):
    listings = Listing.objects.select_related(
        'host', 
        'neighbourhood', 
        'listingcategorical', 
        'listingreviews', 
        # 'minmaxnight',
    ).all()

    data = [
        {
            'listing_id': listing.listing_id,
            'latitude': listing.latitude,
            'longitude': listing.longitude,
            'hover_description': listing.listingcategorical.hover_description,
            'listing_url': listing.listingcategorical.listing_url,
            'price': float(listing.price) if listing.price is not None else 0.0,
            'property_type': listing.listingcategorical.property_type,
            'room_type': listing.listingcategorical.room_type,
            'accommodates': listing.accommodates,
            'number_of_reviews': listing.listingreviews.number_of_reviews,
            'number_of_reviews_ltm': listing.listingreviews.number_of_reviews_ltm,
            'number_of_reviews_l30d': listing.listingreviews.number_of_reviews_l30d,
            'first_review': listing.listingreviews.first_review,
            'last_review': listing.listingreviews.last_review,
            'review_scores_rating': listing.listingreviews.review_scores_rating if listing.listingreviews.review_scores_rating else 0,
            'reviews_per_month': listing.listingreviews.reviews_per_month if listing.listingreviews.reviews_per_month else 0,
            'host_id': listing.host.host_id,
            'host_name': listing.host.host_name,
            'host_identity_verified': listing.host.host_identity_verified,
            'host_listings_count': listing.host.host_listings_count,
            'host_total_listings_count': listing.host.host_total_listings_count,
            'license': listing.listingcategorical.license,
            'neighbourhood': listing.neighbourhood.neighbourhood,
            'minimum_nights': listing.minimum_nights,
            # 'minimum_nights': listing.minmaxnight.minimum_nights,
        } for listing in listings
    ]
    
    return JsonResponse(data, safe=False)

# recreate the PostgreSQL view 'SELECT * FROM price_availability' in Django
def get_price_availability(request):
    price_availability = (
        Calendar.objects.filter(available=True, price__lte=500)
        .values('listing__neighbourhood__neighbourhood', 'date').distinct()  # ensure date is grouped
        .annotate(
            avg_price=Avg('price'),
            available_listings=Count('id'),
        )
        .order_by('listing__neighbourhood__neighbourhood', 'date')
    )
 
    data = [
        {
            'neighbourhood': pa['listing__neighbourhood__neighbourhood'],
            'date': pa['date'],
            'avg_price': pa['avg_price'],
            'available_listings': pa['available_listings']
        } for pa in price_availability
    ]

    return JsonResponse(data, safe=False)