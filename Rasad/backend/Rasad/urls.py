from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from accounts.views import DashboardStatsView, DashboardAlertsView, DashboardReportsView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/accounts/', include('accounts.urls')),
    path('api/core/', include('core.urls')),
    
    # Direct dashboard endpoints for frontend compatibility
    path('api/stats/', DashboardStatsView.as_view(), name='api_stats'),
    path('api/alerts/', DashboardAlertsView.as_view(), name='api_alerts'),
    path('api/reports/', DashboardReportsView.as_view(), name='api_reports'),
    
    # Swagger documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
