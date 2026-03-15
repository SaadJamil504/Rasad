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
    InvitationSerializer, InvitationSignupSerializer, RouteSerializer,
    DeliverySerializer, PaymentSerializer
)
from .models import User, Invitation, Route, Delivery, Payment
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

class DailyDeliveryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliverySerializer(many=True)},
        description="Get today's deliveries for the driver's route. Creates them if they don't exist."
    )
    def get(self, request):
        if request.user.role != 'driver':
            return Response({'error': 'Unauthorized. Only drivers can access this.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            route = Route.objects.get(driver=request.user)
        except Route.DoesNotExist:
            return Response({'error': 'No route assigned to this driver.'}, status=status.HTTP_404_NOT_FOUND)
            
        today = timezone.now().date()
        customers = User.objects.filter(route=route, role='customer')
        
        # Ensure delivery entries exist for today
        for customer in customers:
            delivery, created = Delivery.objects.get_or_create(
                customer=customer,
                date=today,
                defaults={
                    'route': route,
                    'quantity': customer.daily_quantity or 0,
                    'price_at_delivery': 0  # To be set below
                }
            )
            
            if created or not delivery.is_delivered:
                # Capture current price from owner
                owner = route.owner
                price = 0
                if customer.milk_type == 'cow':
                    price = owner.cow_price
                elif customer.milk_type == 'buffalo':
                    price = owner.buffalo_price
                
                delivery.price_at_delivery = price
                delivery.quantity = customer.daily_quantity or 0
                delivery.total_amount = delivery.quantity * price
                delivery.save()
            
        deliveries = Delivery.objects.filter(route=route, date=today)
        serializer = DeliverySerializer(deliveries, many=True)
        return Response(serializer.data)

class DeliveryToggleView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliverySerializer},
        description="Toggle the delivery status for a specific customer today."
    )
    def post(self, request, pk):
        if request.user.role != 'driver':
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            delivery = Delivery.objects.get(pk=pk, route__driver=request.user)
            
            # Logic for updating customer balance
            customer = delivery.customer
            if not delivery.is_delivered:
                # Marking as delivered: increase balance
                customer.outstanding_balance += delivery.total_amount
            else:
                # Marking as NOT delivered: decrease balance
                customer.outstanding_balance -= delivery.total_amount
            customer.save()

            delivery.is_delivered = not delivery.is_delivered
            delivery.delivered_at = timezone.now() if delivery.is_delivered else None
            delivery.save()
            return Response(DeliverySerializer(delivery).data)
        except Delivery.DoesNotExist:
            return Response({'error': 'Delivery record not found.'}, status=status.HTTP_404_NOT_FOUND)

class CustomerDeliveryStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliverySerializer},
        description="Get today's delivery status for the current customer."
    )
    def get(self, request):
        if request.user.role != 'customer':
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        today = timezone.now().date()
        delivery = Delivery.objects.filter(customer=request.user, date=today).first()
        
        if not delivery:
            return Response({'message': 'No delivery scheduled yet for today.'}, status=status.HTTP_200_OK)
            
        return Response(DeliverySerializer(delivery).data)

class UpdateMilkPricesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=UserSerializer,
        responses={200: UserSerializer},
        description="Update milk prices for the owner."
    )
    def post(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Only owners can set prices.'}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        user.cow_price = request.data.get('cow_price', user.cow_price)
        user.buffalo_price = request.data.get('buffalo_price', user.buffalo_price)
        user.save()
        return Response(UserSerializer(user).data)

class DeliveryHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliverySerializer(many=True)},
        description="Get full delivery history for the user."
    )
    def get(self, request):
        if request.user.role == 'customer':
            deliveries = Delivery.objects.filter(customer=request.user, is_delivered=True).order_by('-date')
        elif request.user.role == 'driver':
            try:
                route = Route.objects.get(driver=request.user)
                deliveries = Delivery.objects.filter(route=route, is_delivered=True).order_by('-date')
            except Route.DoesNotExist:
                return Response({'error': 'No route assigned.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = DeliverySerializer(deliveries, many=True)
        return Response(serializer.data)

class PaymentRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=PaymentSerializer,
        responses={201: PaymentSerializer},
        description="Customer reports a payment."
    )
    def post(self, request):
        if request.user.role != 'customer':
            return Response({'error': 'Only customers can report payments.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PaymentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(customer=request.user, status='pending')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PaymentListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: PaymentSerializer(many=True)},
        description="List payments. Owners see pending payments from their customers. Customers see their own history."
    )
    def get(self, request):
        if request.user.role == 'customer':
            payments = Payment.objects.filter(customer=request.user).order_by('-created_at')
        elif request.user.role == 'owner':
            # Payments from customers linked to this owner
            payments = Payment.objects.filter(customer__parent_owner=request.user, status='pending').order_by('-created_at')
        else:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)

class ConfirmPaymentView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: PaymentSerializer},
        description="Owner confirms or rejects a payment."
    )
    def post(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Only owners can confirm payments.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            payment = Payment.objects.get(pk=pk, customer__parent_owner=request.user)
            action = request.data.get('action', 'confirm') # confirm or reject

            if payment.status != 'pending':
                return Response({'error': 'Payment is already processed.'}, status=status.HTTP_400_BAD_REQUEST)

            if action == 'confirm':
                payment.status = 'confirmed'
                payment.confirmed_at = timezone.now()
                
                # Update customer balance
                customer = payment.customer
                customer.outstanding_balance -= payment.amount
                customer.total_paid += payment.amount
                customer.save()
            else:
                payment.status = 'rejected'
            
            payment.save()
            return Response(PaymentSerializer(payment).data)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment record not found.'}, status=status.HTTP_404_NOT_FOUND)

class ProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: UserSerializer},
        description="Get current user profile data."
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)
