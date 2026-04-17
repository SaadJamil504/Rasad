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
    DeliverySerializer, PaymentSerializer, DeliveryAdjustmentSerializer, DailyReportSerializer,
    UserSerializer as BaseUserSerializer
)
from .models import User, Invitation, Route, Delivery, Payment, DeliveryAdjustment, DailyReport
from django.db import models, transaction
from django.http import Http404
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import datetime, date
import threading
import logging
import calendar
import io
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

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
            invitation = serializer.save(invited_by=request.user)
            
            # Generate Link instead of sending email
            frontend_url = settings.FRONTEND_URL.rstrip('/')
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
        invitations = Invitation.objects.filter(invited_by=request.user)
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
                'owner_name': invitation.invited_by.first_name or invitation.invited_by.username
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

    def post(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        role = request.data.get('role', 'customer')
        if role == 'driver':
            from .serializers import ManualDriverSerializer
            serializer = ManualDriverSerializer(data=request.data)
        else:
            from .serializers import ManualCustomerSerializer
            serializer = ManualCustomerSerializer(data=request.data)
            
        if serializer.is_valid():
            # Create a placeholder user
            user = serializer.save(
                parent_owner=request.user,
                role=role,
                username=f"tmp_{request.data['phone_number']}"
            )
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StaffDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self, pk, owner):
        try:
            return User.objects.get(pk=pk, parent_owner=owner)
        except User.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk, request.user)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk, request.user)
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk, request.user)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CollectionStatsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        
        today = timezone.now().date()
        total_outstanding = User.objects.filter(parent_owner=request.user, role='customer').aggregate(sum=models.Sum('outstanding_balance'))['sum'] or 0
        overdue_count = User.objects.filter(parent_owner=request.user, role='customer', outstanding_balance__gt=0).count()
        
        collected_this_month = Payment.objects.filter(customer__parent_owner=request.user, status='confirmed', confirmed_at__month=today.month, confirmed_at__year=today.year).aggregate(sum=models.Sum('amount'))['sum'] or 0
        
        # Last month collected for comparison
        from datetime import timedelta
        last_month_date = today.replace(day=1) - timedelta(days=1)
        collected_last_month = Payment.objects.filter(customer__parent_owner=request.user, status='confirmed', confirmed_at__month=last_month_date.month, confirmed_at__year=last_month_date.year).aggregate(sum=models.Sum('amount'))['sum'] or 0
        diff = float(collected_this_month) - float(collected_last_month)
        
        today_collection = Payment.objects.filter(customer__parent_owner=request.user, status='confirmed', confirmed_at__date=today).aggregate(sum=models.Sum('amount'))['sum'] or 0
        
        total_drivers = User.objects.filter(parent_owner=request.user, role='driver').count()
        settled_drivers = total_drivers
        
        return Response({
            'total_outstanding': float(total_outstanding),
            'overdue_count': overdue_count,
            'collected_this_month': float(collected_this_month),
            'last_month_diff': diff,
            'today_collection': float(today_collection),
        })

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
            
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = timezone.now().date()
            
        customers = User.objects.filter(route=route, role='customer')
        
        # Ensure delivery entries exist for the target date
        for customer in customers:
            # Check for approved adjustments
            adjustment = DeliveryAdjustment.objects.filter(
                customer=customer, 
                date=target_date, 
                status='accepted'
            ).first()

            delivery, created = Delivery.objects.get_or_create(
                customer=customer,
                date=target_date,
                defaults={
                    'route': route,
                    'quantity': customer.daily_quantity or 0,
                    'price_at_delivery': 0
                }
            )
            
            if created or (not delivery.is_delivered and delivery.status != 'paused' and (target_date >= timezone.now().date() or delivery.price_at_delivery == 0)):
                # Capture current price from owner (only for today/future or if not already set)
                owner = route.owner
                price = 0
                if customer.milk_type == 'cow':
                    price = owner.cow_price
                elif customer.milk_type == 'buffalo':
                    price = owner.buffalo_price
                
                delivery.price_at_delivery = price
                
                if adjustment:
                    if adjustment.adjustment_type == 'pause':
                        delivery.status = 'paused'
                        delivery.quantity = 0
                    elif adjustment.adjustment_type == 'quantity':
                        delivery.quantity = adjustment.new_quantity
                        delivery.status = 'pending'
                else:
                    delivery.quantity = customer.daily_quantity or 0
                    delivery.status = 'pending'

                delivery.total_amount = delivery.quantity * price
                delivery.save()
            
        deliveries = Delivery.objects.filter(route=route, date=target_date).order_by('customer__sequence_order')
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
            
            if delivery.status == 'paused':
                return Response({'error': 'Cannot toggle a paused delivery.'}, status=status.HTTP_400_BAD_REQUEST)

            # Logic for updating customer balance
            customer = delivery.customer
            if not delivery.is_delivered:
                # Marking as delivered: increase balance
                customer.outstanding_balance += delivery.total_amount
                delivery.status = 'delivered'
            else:
                # Marking as NOT delivered: decrease balance
                customer.outstanding_balance -= delivery.total_amount
                delivery.status = 'pending'
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
        
        owner = request.user
        from decimal import Decimal, InvalidOperation
        buffalo_price = request.data.get('buffalo_price')
        cow_price = request.data.get('cow_price')
        
        # Manually update prices because UserSerializer might have them as read-only method fields
        try:
            if buffalo_price is not None:
                owner.buffalo_price = round(Decimal(str(buffalo_price)))
            if cow_price is not None:
                owner.cow_price = round(Decimal(str(cow_price)))
            owner.save()
        except (InvalidOperation, ValueError, TypeError):
            return Response({'error': 'Invalid price format.'}, status=status.HTTP_400_BAD_REQUEST)

        # Propagate changes to today's deliveries
        today = timezone.now().date()
        today_deliveries = Delivery.objects.filter(
            customer__parent_owner=owner,
            date=today
        )

        for delivery in today_deliveries:
            customer = delivery.customer
            old_total = delivery.total_amount
            
            # Determine new price for this specific delivery
            new_price = 0
            if customer.milk_type == 'cow':
                new_price = owner.cow_price
            elif customer.milk_type == 'buffalo':
                new_price = owner.buffalo_price
            else:
                new_price = max(owner.cow_price, owner.buffalo_price)
            
            delivery.price_at_delivery = new_price
            delivery.total_amount = delivery.quantity * new_price
            delivery.save()

            # If already delivered, adjust customer balance
            if delivery.is_delivered:
                diff = delivery.total_amount - old_total
                customer.outstanding_balance += diff
                customer.save()

        return Response(UserSerializer(owner).data, status=status.HTTP_200_OK)

class DeliveryUpdateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=DeliverySerializer,
        responses={200: DeliverySerializer},
        description="Driver manually updates delivery quantity for a customer today."
    )
    def patch(self, request, pk):
        if request.user.role != 'driver':
            return Response({'error': 'Unauthorized. Only drivers can update quantities.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            delivery = Delivery.objects.get(pk=pk, route__driver=request.user)
            
            # Use Decimal for consistency
            from decimal import Decimal
            new_qty = request.data.get('quantity')
            if new_qty is None:
                return Response({'error': 'Quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                new_qty = Decimal(str(new_qty))
            except:
                return Response({'error': 'Invalid quantity format.'}, status=status.HTTP_400_BAD_REQUEST)

            if new_qty < 0:
                return Response({'error': 'Quantity cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

            old_total = delivery.total_amount
            delivery.quantity = new_qty
            delivery.total_amount = delivery.quantity * delivery.price_at_delivery
            
            # If it was paused, reactivate it if qty > 0
            if delivery.status == 'paused' and new_qty > 0:
                delivery.status = 'pending'
            
            delivery.save()
            
            # If already delivered, adjust customer balance
            if delivery.is_delivered:
                diff = delivery.total_amount - old_total
                customer = delivery.customer
                customer.outstanding_balance += diff
                customer.save()
                
            return Response(DeliverySerializer(delivery).data)
        except Delivery.DoesNotExist:
            return Response({'error': 'Delivery record not found.'}, status=status.HTTP_404_NOT_FOUND)

class DeliveryHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliverySerializer(many=True)},
        description="Get full delivery history for the user."
    )
    def get(self, request):
        # Determine filters
        today = timezone.now().date()
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        period = request.query_params.get('period')  # daily, weekly, monthly

        if request.user.role == 'customer':
            queryset = Delivery.objects.filter(customer=request.user)
        elif request.user.role == 'driver':
            try:
                route = Route.objects.get(driver=request.user)
                queryset = Delivery.objects.filter(route=route)
            except Route.DoesNotExist:
                return Response({'error': 'No route assigned.'}, status=status.HTTP_404_NOT_FOUND)
        elif request.user.role == 'owner':
            customer_id = request.query_params.get('customer_id')
            if customer_id:
                try:
                    customer = User.objects.get(pk=customer_id, parent_owner=request.user, role='customer')
                    queryset = Delivery.objects.filter(customer=customer)
                except User.DoesNotExist:
                    return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'Customer ID is required for owners.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        # Special case: return unique months for a given year
        if request.query_params.get('get_months') == 'true' and year:
            # For the year, find all months with delivered or paused records
            months = queryset.filter(date__year=year).filter(
                models.Q(is_delivered=True) | models.Q(status='paused')
            ).values_list('date__month', flat=True).distinct()
            return Response(sorted(list(months)))

        # Apply period filters
        if period == 'daily':
            queryset = queryset.filter(date=today)
        elif period == 'weekly':
            week_ago = today - timezone.timedelta(days=7)
            queryset = queryset.filter(date__gte=week_ago, date__lte=today)
        elif period == 'monthly' or (month and year):
            # If explicit month/year provided, use them; otherwise current month/year
            if not month:
                month = today.month
            if not year:
                year = today.year
            queryset = queryset.filter(date__month=month, date__year=year)
        # If no period or month/year provided, default to current month
        elif not period:
            queryset = queryset.filter(date__month=today.month, date__year=today.year)

        # Include only delivered or paused deliveries
        queryset = queryset.filter(models.Q(is_delivered=True) | models.Q(status='paused'))

        deliveries = queryset.order_by('-date')
        serializer = DeliverySerializer(deliveries, many=True)
        return Response(serializer.data)

class MonthlyBillView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_bill_data(self, customer, month, year):
        # 1. Start/End Dates
        start_date = date(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        end_date = date(year, month, last_day)

        # 2. Previous Balance (Sum deliveries before start_date - Sum confirmed payments before start_date)
        prev_deliveries = Delivery.objects.filter(
            customer=customer, 
            date__lt=start_date,
            is_delivered=True
        ).aggregate(sum=models.Sum('total_amount'))['sum'] or 0
        
        prev_payments = Payment.objects.filter(
            customer=customer,
            date__lt=start_date,
            status='confirmed'
        ).aggregate(sum=models.Sum('amount'))['sum'] or 0
        
        opening_balance = float(prev_deliveries) - float(prev_payments)

        # 3. Monthly Deliveries (Include paused too but with 0 total)
        monthly_deliveries = Delivery.objects.filter(
            customer=customer,
            date__range=[start_date, end_date]
        ).filter(models.Q(is_delivered=True) | models.Q(status='paused')).order_by('date')
        
        delivery_total = sum(d.total_amount for d in monthly_deliveries)

        # 4. Monthly Payments
        monthly_payments = Payment.objects.filter(
            customer=customer,
            date__range=[start_date, end_date],
            status='confirmed'
        ).order_by('date')
        
        payment_total = sum(p.amount for p in monthly_payments)

        # 5. Closing Balance
        closing_balance = opening_balance + float(delivery_total) - float(payment_total)

        return {
            'customer': customer,
            'month_name': start_date.strftime('%B'),
            'year': year,
            'opening_balance': opening_balance,
            'deliveries': monthly_deliveries,
            'delivery_total': float(delivery_total),
            'payments': monthly_payments,
            'payment_total': float(payment_total),
            'closing_balance': closing_balance
        }

    def get(self, request):
        customer_id = request.query_params.get('customer_id')
        month = request.query_params.get('month')
        year = request.query_params.get('year')

        if not month or not year:
            return Response({'error': 'Month and Year are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response({'error': 'Invalid month or year.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == 'customer':
            customer = request.user
        elif request.user.role == 'owner':
            if not customer_id:
                return Response({'error': 'Customer ID is required for owners.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                customer = User.objects.get(pk=customer_id, parent_owner=request.user, role='customer')
            except User.DoesNotExist:
                return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        bill_data = self.get_bill_data(customer, month, year)
        
        # Format for JSON response
        response_data = {
            'customer_name': bill_data['customer'].first_name or bill_data['customer'].username,
            'customer_addr': bill_data['customer'].address,
            'month_name': bill_data['month_name'],
            'year': bill_data['year'],
            'opening_balance': bill_data['opening_balance'],
            'deliveries': DeliverySerializer(bill_data['deliveries'], many=True).data,
            'delivery_total': bill_data['delivery_total'],
            'payments': PaymentSerializer(bill_data['payments'], many=True).data,
            'payment_total': bill_data['payment_total'],
            'closing_balance': bill_data['closing_balance']
        }
        return Response(response_data)

class MonthlyBillPDFView(MonthlyBillView):
    def get(self, request):
        customer_id = request.query_params.get('customer_id')
        month = request.query_params.get('month')
        year = request.query_params.get('year')

        if not month or not year:
            return Response({'error': 'Month and Year are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response({'error': 'Invalid month or year.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == 'customer':
            customer = request.user
        elif request.user.role == 'owner':
            if not customer_id:
                return Response({'error': 'Customer ID is required for owners.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                customer = User.objects.get(pk=customer_id, parent_owner=request.user, role='customer')
            except User.DoesNotExist:
                return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        bill_data = self.get_bill_data(customer, month, year)
        
        # Generate PDF using reportlab
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        
        # Define some common styles
        header_font_style = styles["Normal"].clone("HeaderFont")
        header_font_style.fontName = "Helvetica-Bold"
        header_font_style.fontSize = 11

        elements = []

        # Colors - Minimalist and Eye-Comfort
        primary_text = colors.black
        secondary_text = colors.grey
        border_color = colors.lightgrey
        table_header_bg = colors.whitesmoke
        summary_bg = colors.whitesmoke
        
        # Custom Title Style
        title_style = styles["Title"].clone("BillTitle")
        title_style.fontName = "Helvetica-Bold"
        title_style.fontSize = 20
        title_style.textColor = primary_text
        title_style.alignment = 1  # Center
        title_style.spaceAfter = 10

        # Header Section
        elements.append(Paragraph("RASAD - Monthly Bill", title_style))
        
        # Month/Year Subtitle
        subtitle_style = styles["Heading2"].clone("BillSubtitle")
        subtitle_style.alignment = 1
        subtitle_style.textColor = secondary_text
        subtitle_style.fontSize = 14
        elements.append(Paragraph(f"{bill_data['month_name']} {bill_data['year']}", subtitle_style))
        elements.append(Spacer(1, 0.4 * inch))

        # Customer Info & Dairy Info
        address_parts = [customer.house_no, customer.street, customer.area, customer.city]
        full_address = ", ".join([p for p in address_parts if p])
        if not full_address:
            full_address = customer.address or "N/A"

        info_data = [
            [
                Paragraph(f"<b>BILL TO:</b><br/>{customer.first_name or customer.username}<br/>{customer.phone_number}<br/>{full_address}", styles["Normal"]),
                Paragraph(f"<b>FROM:</b><br/>{customer.parent_owner.dairy_name if customer.parent_owner else 'Milk Supply'}<br/>{customer.parent_owner.phone_number if customer.parent_owner else ''}", styles["Normal"])
            ]
        ]
        info_table = Table(info_data, colWidths=[3.5 * inch, 3 * inch])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.4 * inch))

        # Summary Table
        elements.append(Paragraph("ACCOUNT SUMMARY", header_font_style))
        elements.append(Spacer(1, 0.05 * inch))
        
        summary_data = [
            ["Opening Balance", f"Rs. {bill_data['opening_balance']:.2f}"],
            ["Monthly Deliveries (+)", f"Rs. {bill_data['delivery_total']:.2f}"],
            ["Monthly Payments (-)", f"Rs. {bill_data['payment_total']:.2f}"],
            ["Closing Balance", f"Rs. {bill_data['closing_balance']:.2f}"],
        ]
        s_table = Table(summary_data, colWidths=[2.5 * inch, 1.5 * inch])
        closing_color = colors.black # Neutral for comfort, or subtle red
        if bill_data['closing_balance'] > 0:
            closing_color = colors.HexColor("#B71C1C") # Dark red
        elif bill_data['closing_balance'] < 0:
            closing_color = colors.HexColor("#1B5E20") # Dark green

        s_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, border_color),
            ('BACKGROUND', (0,0), (0,-1), table_header_bg),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('FONTNAME', (1,-1), (-1,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (1,3), (1,3), closing_color),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(s_table)
        elements.append(Spacer(1, 0.4 * inch))

        # Deliveries Table
        elements.append(Paragraph("DELIVERY DETAILS", header_font_style))
        elements.append(Spacer(1, 0.05 * inch))
        
        d_header = ["Date", "Status", "Qty (L)", "Price", "Total Amount"]
        d_rows = [d_header]
        total_qty = 0
        for d in bill_data['deliveries']:
            status_text = "Delivered" if d.is_delivered else "Paused" if d.status == 'paused' else "Pending"
            d_rows.append([
                d.date.strftime('%Y-%m-%d'),
                status_text,
                f"{d.quantity:.1f}",
                f"{d.price_at_delivery:.1f}",
                f"{d.total_amount:.2f}"
            ])
            total_qty += d.quantity
        
        # Add a Total row (No HTML tags here, styling handled by TableStyle)
        d_rows.append(["", "TOTAL", f"{total_qty:.1f} L", "", f"Rs. {bill_data['delivery_total']:.2f}"])
        
        d_table = Table(d_rows, colWidths=[1.2*inch, 1.2*inch, 1*inch, 1*inch, 1.5*inch])
        d_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), table_header_bg),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-2), 0.5, border_color),
            ('LINEBELOW', (0,0), (-1,0), 1, colors.black),
            # Total row styling
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('BACKGROUND', (0,-1), (-1,-1), table_header_bg),
            ('LINEABOVE', (0,-1), (-1,-1), 1, colors.black),
        ]))
        elements.append(d_table)
        elements.append(Spacer(1, 0.4 * inch))

        # Payments Table
        if bill_data['payments'].exists():
            elements.append(Paragraph("PAYMENT HISTORY", header_font_style))
            elements.append(Spacer(1, 0.05 * inch))
            
            p_header = ["Date", "Method", "Amount"]
            p_rows = [p_header]
            for p in bill_data['payments']:
                p_rows.append([
                    p.date.strftime('%Y-%m-%d'),
                    p.method,
                    f"Rs. {p.amount:.2f}"
                ])
            
            # Add a Total row
            p_rows.append(["", "TOTAL RECEIVED", f"Rs. {bill_data['payment_total']:.2f}"])

            p_table = Table(p_rows, colWidths=[2*inch, 2*inch, 2.3*inch])
            p_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), table_header_bg),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-2), 0.5, border_color),
                ('LINEBELOW', (0,0), (-1,0), 1, colors.black),
                # Total row styling
                ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
                ('BACKGROUND', (0,-1), (-1,-1), table_header_bg),
                ('LINEABOVE', (0,-1), (-1,-1), 1, colors.black),
            ]))
            elements.append(p_table)

        # Footer
        elements.append(Spacer(1, 0.5 * inch))
        footer_style = styles["Normal"].clone("FooterStyle")
        footer_style.alignment = 1
        footer_style.textColor = secondary_text
        footer_style.fontSize = 9
        elements.append(Paragraph("Thank you for choosing RASAD. For any queries, please contact your dairy supply.", footer_style))

        doc.build(elements)
        buffer.seek(0)
        
        filename = f"Bill_{customer.username}_{bill_data['month_name']}_{year}.pdf"
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

class PaymentRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=PaymentSerializer,
        responses={201: PaymentSerializer},
        description="Customer reports a payment."
    )
    def post(self, request):
        if request.user.role == 'customer':
            serializer = PaymentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(customer=request.user, status='pending')
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.user.role == 'owner':
            # Owner manually records a payment
            customer_id = request.data.get('customer')
            if not customer_id:
                return Response({'error': 'Customer ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                target_customer = User.objects.get(pk=customer_id, parent_owner=request.user)
            except User.DoesNotExist:
                return Response({'error': 'Invalid customer selection.'}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = PaymentSerializer(data=request.data)
            if serializer.is_valid():
                payment = serializer.save(
                    customer=target_customer,
                    status='confirmed',
                    received_by=request.user,
                    confirmed_at=timezone.now()
                )
                # Deduct balance immediately
                target_customer.outstanding_balance -= payment.amount
                target_customer.total_paid += payment.amount
                target_customer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.user.role == 'driver':
            # Driver records a payment for their assigned customer
            customer_id = request.data.get('customer')
            if not customer_id:
                return Response({'error': 'Customer ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Ensure the customer is on one of the driver's routes
                route = Route.objects.get(driver=request.user)
                target_customer = User.objects.get(pk=customer_id, route=route, role='customer')
            except Route.DoesNotExist:
                return Response({'error': 'No route assigned to this driver.'}, status=status.HTTP_404_NOT_FOUND)
            except User.DoesNotExist:
                return Response({'error': 'Customer not found on your route.'}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = PaymentSerializer(data=request.data)
            if serializer.is_valid():
                # Drivers can report payments but they stay PENDING until owner confirms
                payment = serializer.save(
                    customer=target_customer,
                    status='pending',
                    received_by=request.user
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

class PaymentListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: PaymentSerializer(many=True)},
        description="List payments. Owners see pending payments from their customers. Customers see their own history."
    )
    def get(self, request):
        customer_id = request.query_params.get('customer_id')
        status_filter = request.query_params.get('status')
        if request.user.role == 'customer':
            payments = Payment.objects.filter(customer=request.user)
        elif request.user.role == 'owner':
            if customer_id:
                payments = Payment.objects.filter(customer__parent_owner=request.user, customer_id=customer_id)
            else:
                payments = Payment.objects.filter(customer__parent_owner=request.user)
        else:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        if status_filter:
            payments = payments.filter(status=status_filter)
        
        payments = payments.order_by('-created_at')
            
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

class DeliveryAdjustmentCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=DeliveryAdjustmentSerializer,
        responses={201: DeliveryAdjustmentSerializer},
        description="Customer creates a pause or quantity change request."
    )
    def post(self, request):
        if request.user.role != 'customer':
            return Response({'error': 'Only customers can request adjustments.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = DeliveryAdjustmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(customer=request.user, status='pending')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeliveryAdjustmentListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliveryAdjustmentSerializer(many=True)},
        description="List adjustment requests. Drivers see for their route, Owners see for all their customers."
    )
    def get(self, request):
        date_str = request.query_params.get('date')
        if request.user.role == 'driver':
            try:
                route = Route.objects.get(driver=request.user)
                adjustments = DeliveryAdjustment.objects.filter(customer__route=route)
                if date_str:
                    adjustments = adjustments.filter(date=date_str)
                adjustments = adjustments.order_by('-date')
            except Route.DoesNotExist:
                return Response({'error': 'No route assigned.'}, status=status.HTTP_404_NOT_FOUND)
        elif request.user.role == 'owner':
            adjustments = DeliveryAdjustment.objects.filter(customer__parent_owner=request.user).order_by('-date')
        elif request.user.role == 'customer':
            adjustments = DeliveryAdjustment.objects.filter(customer=request.user).order_by('-date')
        else:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = DeliveryAdjustmentSerializer(adjustments, many=True)
        return Response(serializer.data)

class DeliveryAdjustmentActionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliveryAdjustmentSerializer},
        description="Driver accepts or rejects an adjustment request."
    )
    def post(self, request, pk):
        if request.user.role != 'driver':
            return Response({'error': 'Only drivers can action requests.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            adjustment = DeliveryAdjustment.objects.get(pk=pk, customer__route__driver=request.user)
            action = request.data.get('action') # accept or reject
            comment = request.data.get('driver_comment', '')

            if action == 'accept':
                adjustment.status = 'accepted'
                # If it's for today, we might want to trigger a refresh of today's delivery record
                # However, DailyDeliveryView already checks for accepted adjustments.
                # If the delivery record for today ALREADY exists and is NOT delivered, we should update it now.
                today = timezone.now().date()
                if adjustment.date == today:
                    delivery = Delivery.objects.filter(customer=adjustment.customer, date=today).first()
                    if delivery and not delivery.is_delivered:
                        if adjustment.adjustment_type == 'pause':
                            delivery.status = 'paused'
                            delivery.quantity = 0
                        elif adjustment.adjustment_type == 'quantity':
                            delivery.quantity = adjustment.new_quantity
                            delivery.status = 'pending'
                        
                        delivery.total_amount = delivery.quantity * delivery.price_at_delivery
                        delivery.save()
            elif action == 'reject':
                adjustment.status = 'rejected'
            else:
                return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)
            
            adjustment.driver_comment = comment
            adjustment.save()
            return Response(DeliveryAdjustmentSerializer(adjustment).data)
        except DeliveryAdjustment.DoesNotExist:
            return Response({'error': 'Adjustment request not found.'}, status=status.HTTP_404_NOT_FOUND)

class DashboardStatsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: dict},
        description="Get summary stats for the owner's dashboard."
    )
    def get(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        today = timezone.now().date()
        yesterday = today - timezone.timedelta(days=1)
        
        # 1. Today's Deliveries 
        # If deliveries aren't explicitly created by a script yet, we should look at active customers
        # to know how many deliveries are EXPECTED today.
        deliveries_today = Delivery.objects.filter(route__owner=request.user, date=today)
        done_d = deliveries_today.filter(status__in=['delivered', 'paused']).count()
        
        # Total expected deliveries = total active customers assigned to a route
        # (Assuming all assigned customers should get a delivery unless paused/delivered)
        active_customers_assigned = User.objects.filter(parent_owner=request.user, role='customer', route__isnull=False).count()
        
        # If deliveries_today exist, use that count, otherwise fallback to the number of active assigned customers
        total_d = max(deliveries_today.count(), active_customers_assigned)
        pending_d = total_d - done_d
        
        # 2. Today's Revenue
        revenue_today = deliveries_today.filter(status='delivered').aggregate(total=models.Sum('total_amount'))['total'] or 0
        revenue_yesterday = Delivery.objects.filter(
            route__owner=request.user, 
            date=yesterday, 
            status='delivered'
        ).aggregate(total=models.Sum('total_amount'))['total'] or 0
        
        revenue_change_pct = 0
        if revenue_yesterday > 0:
            revenue_change_pct = ((revenue_today - revenue_yesterday) / revenue_yesterday) * 100
            
        # 3. Overdue/Outstanding
        customers = User.objects.filter(parent_owner=request.user, role='customer')
        overdue_customers_count = customers.filter(outstanding_balance__gt=0).count()
        total_outstanding = customers.aggregate(total=models.Sum('outstanding_balance'))['total'] or 0
        
        # 4. Active Customers
        total_customers = customers.count()
        paused_today = deliveries_today.filter(status='paused').count()
        
        return Response({
            'deliveries': {
                'total': total_d,
                'done': done_d,
                'pending': pending_d
            },
            'revenue': {
                'amount': float(revenue_today),
                'change_pct': float(revenue_change_pct)
            },
            'overdue': {
                'count': overdue_customers_count,
                'total_amount': float(total_outstanding)
            },
            'customers': {
                'total': total_customers,
                'paused_today': paused_today
            }
        })

class DashboardAlertsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: dict},
        description="Get overdue customers and today's paused deliveries for owner."
    )
    def get(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        today = timezone.now().date()

        # 1. Overdue Customers
        overdue_customers = User.objects.filter(
            parent_owner=request.user, 
            role='customer', 
            outstanding_balance__gt=0
        ).order_by('-outstanding_balance')[:10]
        
        overdue_data = [{
            'id': c.id,
            'name': c.first_name or c.username,
            'amount': c.outstanding_balance,
            'route': c.route.name if c.route else 'Unassigned',
            'address': c.address or 'N/A'
        } for c in overdue_customers]

        # 2. Paused Deliveries Today
        paused_deliveries = Delivery.objects.filter(
            route__owner=request.user,
            date=today,
            status='paused'
        ).select_related('customer', 'route')

        paused_data = []
        for d in paused_deliveries:
            # Check if there's a corresponding accepted pause adjustment to show reason
            adj = DeliveryAdjustment.objects.filter(
                customer=d.customer,
                date=today,
                status='accepted',
                adjustment_type='pause'
            ).first()
            
            paused_data.append({
                'id': d.id,
                'customer_name': d.customer.first_name or d.customer.username,
                'route': d.route.name if d.route else 'Unassigned',
                'reason': adj.message if adj and adj.message else 'Paused'
            })

        return Response({
            'overdue': overdue_data,
            'paused': paused_data
        })

class DashboardReportsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: dict},
        description="Get an analytical report for the owner including total milk, revenue and chart data."
    )
    def get(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        today = timezone.now().date()
        current_month = today.month
        current_year = today.year

        # 1 & 2. Total milk and revenue of this month (Calculated based on CONFIRMED deliveries only)
        deliveries_this_month = Delivery.objects.filter(
            route__owner=request.user,
            date__month=current_month,
            date__year=current_year,
            status='delivered'
        )
        
        total_milk_this_month = deliveries_this_month.aggregate(total=models.Sum('quantity'))['total'] or 0
        total_revenue_this_month = deliveries_this_month.aggregate(total=models.Sum('total_amount'))['total'] or 0

        # Removed fallback logic that estimated milk/revenue to ensure data accuracy with Main Dashboard

        # 3. Percentage of total collected amount to overdue amount
        customers = User.objects.filter(parent_owner=request.user, role='customer')
        total_overdue = customers.aggregate(total=models.Sum('outstanding_balance'))['total'] or 0
        total_collected = customers.aggregate(total=models.Sum('total_paid'))['total'] or 0

        collection_percentage = 0
        if (total_collected + total_overdue) > 0:
            collection_percentage = (total_collected / (total_collected + total_overdue)) * 100

        # 4. Graph data: Last 12 months or rolling 6 months (5 past + current)
        monthly_revenue_data = []
        
        # We want to show the last 6 months (5 past + current)
        for i in range(5, -1, -1):
            # Calculate year and month for 'i' months ago
            target_year = current_year
            target_month = current_month - i
            
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            
            rev = Delivery.objects.filter(
                route__owner=request.user,
                date__month=target_month,
                date__year=target_year,
                status='delivered'
            ).aggregate(total=models.Sum('total_amount'))['total'] or 0
            
            month_name = datetime(target_year, target_month, 1).strftime('%b')
            monthly_revenue_data.append({
                'month': f"{month_name} '{str(target_year)[-2:]}",
                'revenue': float(rev)
            })

        return Response({
            'this_month_milk': float(total_milk_this_month),
            'this_month_revenue': float(total_revenue_this_month),
            'total_overdue': float(total_overdue),
            'total_collected': float(total_collected),
            'collection_percentage': float(collection_percentage),
            'monthly_revenue': monthly_revenue_data
        })

class RouteReorderView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=dict(ordered_ids=list),
        responses={200: dict},
        description="Reorder customers within a route."
    )
    def post(self, request, pk):
        try:
            route = Route.objects.get(pk=pk, owner=request.user)
            ordered_ids = request.data.get('ordered_ids', [])
            
            with transaction.atomic():
                for index, user_id in enumerate(ordered_ids):
                    User.objects.filter(id=user_id, route=route).update(sequence_order=index)
            
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except Route.DoesNotExist:
            return Response({'error': 'Route not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DriverCustomerListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: UserSerializer(many=True)},
        description="List all customers assigned to the driver's route."
    )
    def get(self, request):
        if request.user.role != 'driver':
            return Response({'error': 'Unauthorized. Only drivers can access this.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            # A driver might have multiple routes, but usually it's one. 
            # The model says driver is ForeignKey on Route, so a driver can have multiple routes.
            routes = Route.objects.filter(driver=request.user)
            customers = User.objects.filter(route__in=routes, role='customer')
            serializer = UserSerializer(customers, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DriverDailyStatsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: dict},
        description="Get daily stats for the driver (e.g., cash collected today)."
    )
    def get(self, request):
        if request.user.role != 'driver':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        today = timezone.now().date()
        # Sum of payments received by this driver today
        total_collected = Payment.objects.filter(
            received_by=request.user,
            date=today,
            status__in=['pending', 'confirmed']
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        return Response({
            'today_collected': float(total_collected)
        })

class DailyReportView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DailyReportSerializer(many=True)},
        description="Owners see reports for today. Drivers see their own report for today if submitted."
    )
    def get(self, request):
        today = timezone.now().date()
        if request.user.role == 'owner':
            # Owners see all reports from their drivers for today
            reports = DailyReport.objects.filter(driver__parent_owner=request.user, date=today)
            return Response(DailyReportSerializer(reports, many=True).data)
        elif request.user.role == 'driver':
            # Drivers see their own report for today
            report = DailyReport.objects.filter(driver=request.user, date=today).first()
            if report:
                return Response(DailyReportSerializer(report).data)
            return Response({'status': 'not_submitted'}, status=status.HTTP_200_OK)
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    @extend_schema(
        responses={201: DailyReportSerializer},
        description="Driver submits their final daily report."
    )
    def post(self, request):
        if request.user.role != 'driver':
            return Response({'error': 'Only drivers can submit reports.'}, status=status.HTTP_403_FORBIDDEN)
            
        today = timezone.now().date()
        
        # Check if report already exists for today
        if DailyReport.objects.filter(driver=request.user, date=today).exists():
            return Response({'error': 'You have already submitted today\'s report.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate stats for today
        # 1. Total milk delivered (only where is_delivered is True/status is 'delivered')
        total_milk = Delivery.objects.filter(
            route__driver=request.user, 
            date=today, 
            status='delivered'
        ).aggregate(total=models.Sum('quantity'))['total'] or 0
        
        # 2. Total cash collected (pending or confirmed)
        total_cash = Payment.objects.filter(
            received_by=request.user,
            date=today,
            status__in=['pending', 'confirmed']
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        # 3. Total customers delivered to
        customers_served = Delivery.objects.filter(
            route__driver=request.user, 
            date=today, 
            status='delivered'
        ).values('customer').distinct().count()

        # 4. Total assigned customers for this driver
        total_customers = User.objects.filter(route__driver=request.user, role='customer').count()
        
        # Create report
        report = DailyReport.objects.create(
            driver=request.user,
            date=today,
            total_milk=total_milk,
            total_cash=total_cash,
            customers_served=customers_served,
            total_customers=total_customers
        )
        
        return Response(DailyReportSerializer(report).data, status=status.HTTP_201_CREATED)

class OwnerDailyDeliveriesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: DeliverySerializer(many=True)},
        description="Get today's deliveries for all customers of the owner. Creates them if they don't exist."
    )
    def get(self, request):
        if request.user.role != 'owner':
            return Response({'error': 'Unauthorized. Only owners can access this.'}, status=status.HTTP_403_FORBIDDEN)
            
        target_date = timezone.now().date()
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get all customers for this owner who are assigned to a route
        customers = User.objects.filter(parent_owner=request.user, role='customer', route__isnull=False)
        
        # We need to ensure delivery records exist for today for all these customers
        # to show a consistent list to the owner.
        for customer in customers:
            # Check for approved adjustments
            adjustment = DeliveryAdjustment.objects.filter(
                customer=customer, 
                date=target_date, 
                status='accepted'
            ).first()

            delivery, created = Delivery.objects.get_or_create(
                customer=customer,
                date=target_date,
                defaults={
                    'route': customer.route,
                    'quantity': customer.daily_quantity or 0,
                    'price_at_delivery': 0
                }
            )
            
            # If newly created OR if price not set (e.g. created without route driver login)
            if created or (not delivery.is_delivered and delivery.status != 'paused' and delivery.price_at_delivery == 0):
                # Capture current price from owner
                price = 0
                if customer.milk_type == 'cow':
                    price = request.user.cow_price
                elif customer.milk_type == 'buffalo':
                    price = request.user.buffalo_price
                
                delivery.price_at_delivery = price
                
                if adjustment:
                    if adjustment.adjustment_type == 'pause':
                        delivery.status = 'paused'
                        delivery.quantity = 0
                    elif adjustment.adjustment_type == 'quantity':
                        delivery.quantity = adjustment.new_quantity
                        delivery.status = 'pending'
                else:
                    delivery.quantity = customer.daily_quantity or 0
                    delivery.status = 'pending'

                delivery.total_amount = delivery.quantity * price
                delivery.save()
        
        # Fetch all deliveries for today for this owner
        deliveries = Delivery.objects.filter(
            customer__parent_owner=request.user, 
            date=target_date
        ).select_related('customer', 'route', 'customer__route').order_by('customer__route__name', 'customer__sequence_order')
        
        serializer = DeliverySerializer(deliveries, many=True)
        return Response(serializer.data)
