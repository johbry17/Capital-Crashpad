from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/listings/', views.get_listings, name='get_listings'),
    path('api/price_availability/', views.get_price_availability, name='get_price_availability'),
]
