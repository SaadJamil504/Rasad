from django.urls import path
from .views import (
    LoginView, SignupView, PasswordResetRequestView, PasswordResetConfirmView,
    InvitationListCreateView, InvitationValidateView, InvitationSignupView, StaffListView,
    RouteListCreateView, RouteDetailView, DailyDeliveryView, DeliveryToggleView,
    CustomerDeliveryStatusView, UpdateMilkPricesView, DeliveryHistoryView,
    PaymentRequestView, PaymentListView, ConfirmPaymentView,
    DeliveryAdjustmentCreateView, DeliveryAdjustmentListView, DeliveryAdjustmentActionView,
    ProfileView, DashboardStatsView, DashboardAlertsView, DashboardReportsView
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('invitations/', InvitationListCreateView.as_view(), name='invitation_list_create'),
    path('invitations/validate/<str:token>/', InvitationValidateView.as_view(), name='invitation_validate'),
    path('invitations/signup/', InvitationSignupView.as_view(), name='invitation_signup'),
    path('staff/', StaffListView.as_view(), name='staff_list'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('routes/', RouteListCreateView.as_view(), name='route_list_create'),
    path('routes/<int:pk>/', RouteDetailView.as_view(), name='route_detail'),
    path('deliveries/daily/', DailyDeliveryView.as_view(), name='daily_deliveries'),
    path('deliveries/toggle/<int:pk>/', DeliveryToggleView.as_view(), name='delivery_toggle'),
    path('deliveries/status/', CustomerDeliveryStatusView.as_view(), name='customer_delivery_status'),
    path('deliveries/history/', DeliveryHistoryView.as_view(), name='delivery_history'),
    path('prices/update/', UpdateMilkPricesView.as_view(), name='update_prices'),
    path('payments/report/', PaymentRequestView.as_view(), name='payment_report'),
    path('payments/list/', PaymentListView.as_view(), name='payment_list'),
    path('payments/confirm/<int:pk>/', ConfirmPaymentView.as_view(), name='payment_confirm'),
    path('adjustments/create/', DeliveryAdjustmentCreateView.as_view(), name='adjustment_create'),
    path('adjustments/list/', DeliveryAdjustmentListView.as_view(), name='adjustment_list'),
    path('adjustments/action/<int:pk>/', DeliveryAdjustmentActionView.as_view(), name='adjustment_action'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('dashboard/alerts/', DashboardAlertsView.as_view(), name='dashboard_alerts'),
    path('dashboard/reports/', DashboardReportsView.as_view(), name='dashboard_reports'),
]
