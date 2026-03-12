from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from .serializers import (
    LoginSerializer, UserSerializer, SignupSerializer, 
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    InvitationSerializer, InvitationSignupSerializer, RouteSerializer
)
from .models import User, Invitation, Route
from django.http import Http404
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import threading
import logging

logger = logging.getLogger(__name__)

class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=LoginSerializer,
        responses={200: UserSerializer},
        description="Login with username and password and receive JWT tokens."
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SignupView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=SignupSerializer,
        responses={201: UserSerializer},
        description="Register a new user (Owner/Driver/Customer)."
    )
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        
        logger.error(f"Signup failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={200: dict},
        description="Request a password reset. Returns UID and Token (Simulating email)."
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = User.objects.get(email=serializer.validated_data['email'])
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                return Response({
                    'message': 'Password reset tokens generated.',
                    'uid': uid,
                    'token': token
                }, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={200: dict},
        description="Confirm password reset using UID, Token, and new password."
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InvitationListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=InvitationSerializer,
        responses={201: InvitationSerializer},
        description="Invite a new Driver or Customer."
    )
    def post(self, request):
        if request.user.role != 'owner':
            logger.warning(f"Unauthorized invitation attempt by user {request.user.username} with role {request.user.role}")
            return Response({'error': 'Only owners can send invitations.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = InvitationSerializer(data=request.data)
        if serializer.is_valid():
            invitation = serializer.save(owner=request.user)
            
            # Generate Link instead of sending email
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            signup_url = f"{frontend_url}/join/{invitation.token}"
            
            return Response({
                **serializer.data,
                'signup_url': signup_url
            }, status=status.HTTP_201_CREATED)
            
        logger.error(f"Invitation creation failed for user {request.user.username}: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: InvitationSerializer(many=True)},
        description="List all invitations sent by the owner."
    )
    def get(self, request):
        invitations = Invitation.objects.filter(owner=request.user)
        serializer = InvitationSerializer(invitations, many=True)
        return Response(serializer.data)

class InvitationValidateView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        responses={200: dict},
        description="Validate an invitation token."
    )
    def get(self, request, token):
        token = token.strip('/')
        try:
            invitation = Invitation.objects.get(token=token, is_used=False)
            if invitation.expires_at < timezone.now():
                return Response({'error': 'Token expired'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({
                'role': invitation.role,
                'email': invitation.email,
                'owner_name': invitation.owner.first_name or invitation.owner.username
            }, status=status.HTTP_200_OK)
        except Invitation.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

class InvitationSignupView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=InvitationSignupSerializer,
        responses={201: UserSerializer},
        description="Register a new user using an invitation token."
    )
    def post(self, request):
        serializer = InvitationSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        
        logger.error(f"Invitation signup failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StaffListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: UserSerializer(many=True)},
        description="List all Drivers or Customers linked to the Owner."
    )
    def get(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        role = request.query_params.get('role')
        no_route = request.query_params.get('no_route')
        queryset = User.objects.filter(parent_owner=request.user)
        if role:
            queryset = queryset.filter(role=role)
        if no_route == 'true':
            queryset = queryset.filter(route__isnull=True)
            
        serializer = UserSerializer(queryset, many=True)
        return Response(serializer.data)

class RouteListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=RouteSerializer,
        responses={201: RouteSerializer},
        description="List or create delivery routes (Owner only)."
    )
    def get(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        routes = Route.objects.filter(owner=request.user)
        serializer = RouteSerializer(routes, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Only owners can create routes.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = RouteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RouteDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self, pk, user):
        try:
            return Route.objects.get(pk=pk, owner=user)
        except Route.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        route = self.get_object(pk, request.user)
        serializer = RouteSerializer(route)
        return Response(serializer.data)

    def put(self, request, pk):
        route = self.get_object(pk, request.user)
        serializer = RouteSerializer(route, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        route = self.get_object(pk, request.user)
        route.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
