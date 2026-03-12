from django.urls import path
from .views import (
    LoginView, SignupView, PasswordResetRequestView, PasswordResetConfirmView,
    InvitationListCreateView, InvitationValidateView, InvitationSignupView, StaffListView,
    RouteListCreateView, RouteDetailView
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
]
