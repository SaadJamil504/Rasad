from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from accounts.views import DashboardStatsView, DashboardAlertsView, DashboardReportsView

def signup_redirect(request):
    token = request.GET.get('token', '')
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Opening Rasad App...</title>
        <style>
            body {{ font-family: -apple-system, sans-serif; text-align: center; padding: 40px 20px; background-color: #f8fafc; color: #0f172a; }}
            .btn {{ display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; margin-top: 20px; }}
            h2 {{ margin-bottom: 8px; }}
            p {{ color: #64748b; }}
        </style>
    </head>
    <body>
        <h2>Opening Rasad App...</h2>
        <p>If the app doesn't open automatically, please tap the button below.</p>
        <a href="rasadapp://customer-signup?token={token}" class="btn">Open App</a>
        
        <script>
            // Attempt automatic deep-link redirect
            window.location.href = "rasadapp://customer-signup?token={token}";
        </script>
    </body>
    </html>
    """
    return HttpResponse(html)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/accounts/', include('accounts.urls')),
    path('api/core/', include('core.urls')),
    
    # Web deep link redirect
    path('customer-signup', signup_redirect),
    
    # Direct dashboard endpoints for frontend compatibility
    path('api/stats/', DashboardStatsView.as_view(), name='api_stats'),
    path('api/alerts/', DashboardAlertsView.as_view(), name='api_alerts'),
    path('api/reports/', DashboardReportsView.as_view(), name='api_reports'),
    
    # Swagger documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
