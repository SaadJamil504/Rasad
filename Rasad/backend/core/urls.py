from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RouteViewSet, CustomerViewSet,ComplaintViewSet

router = DefaultRouter()
router.register(r'routes', RouteViewSet, basename='route')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'complaints', ComplaintViewSet, basename='complaint')

urlpatterns = [
    path('', include(router.urls)),
]
