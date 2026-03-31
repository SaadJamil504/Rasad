from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Invitation, Route, Delivery, Payment, DeliveryAdjustment, DailyReport
import uuid
from django.utils import timezone
from datetime import timedelta
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator

class LoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        phone_number = data.get('phone_number')
        password = data.get('password')
        
        # Find user by phone number
        try:
            user_obj = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            raise serializers.ValidationError("Incorrect Credentials")
        
        # Use Django's built-in authentication (username is phone_number)
        user = authenticate(username=user_obj.username, password=password)
        if not user or not user.is_active:
            raise serializers.ValidationError("Incorrect Credentials")
        return user

class UserSerializer(serializers.ModelSerializer):
    owner_dairy_name = serializers.SerializerMethodField()
    route_name = serializers.SerializerMethodField()
    cow_price = serializers.SerializerMethodField()
    buffalo_price = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'phone_number', 'first_name', 'license_number', 'milk_type', 'daily_quantity', 'house_no', 'street', 'area', 'city', 'address', 'latitude', 'longitude', 'dairy_name', 'owner_dairy_name', 'route', 'route_name', 'buffalo_price', 'cow_price', 'outstanding_balance', 'total_paid', 'date_joined', 'sequence_order')
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'license_number': {'required': False, 'allow_blank': True},
            'house_no': {'required': False, 'allow_blank': True},
            'street': {'required': False, 'allow_blank': True},
            'area': {'required': False, 'allow_blank': True},
            'city': {'required': False, 'allow_blank': True},
            'dairy_name': {'required': False, 'allow_blank': True},
        }

    def validate_first_name(self, value):
        # Allow only alphabets and spaces
        import re
        if not re.fullmatch(r'[A-Za-z ]+', value):
            raise serializers.ValidationError('Name must contain only letters and spaces.')
        return value.strip()

    def validate_license_number(self, value):
        # Alphanumeric only
        import re
        if not re.fullmatch(r'[A-Za-z0-9]+', value):
            raise serializers.ValidationError('License number must be alphanumeric.')
        return value.strip()

    def validate_daily_quantity(self, value):
        # Prevent negative and handle "-0"
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError('Daily quantity cannot be negative.')
        if value == -0:
            return 0
        return value

    def validate_house_no(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()

    def validate_street(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()

    def validate_area(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()

    def validate_city(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()

    def validate_dairy_name(self, value):
        if value and not all(x.isalpha() or x.isspace() for x in value):
            raise serializers.ValidationError("Dairy Name must only contain alphabets.")
        return value


    def get_owner_dairy_name(self, obj):
        if obj.role == 'owner':
            return obj.dairy_name
        if obj.parent_owner:
            return obj.parent_owner.dairy_name
        return None

    def get_route_name(self, obj):
        return obj.route.name if obj.route else None
        
    def get_cow_price(self, obj):
        if obj.role == 'owner':
            return obj.cow_price
        if obj.parent_owner:
            return obj.parent_owner.cow_price
        return obj.cow_price

    def get_buffalo_price(self, obj):
        if obj.role == 'owner':
            return obj.buffalo_price
        if obj.parent_owner:
            return obj.parent_owner.buffalo_price
        return obj.buffalo_price

class SignupSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    cow_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    buffalo_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)

    class Meta:
        model = User
        fields = ('password', 'full_name', 'phone_number', 'email', 'role', 'house_no', 'street', 'area', 'city', 'address', 'latitude', 'longitude', 'dairy_name', 'cow_price', 'buffalo_price')
        extra_kwargs = {
            'phone_number': {'required': True, 'validators': []},
            'email': {'required': True, 'validators': []},
        }

    def validate_full_name(self, value):
        import re
        if not re.fullmatch(r'[A-Za-z ]+', value):
            raise serializers.ValidationError('Name must contain only letters and spaces.')
        return value.strip()

    def validate_house_no(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()
    
    def validate_street(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()
    
    def validate_area(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()
    
    def validate_city(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()

    def validate_dairy_name(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()

    def validate_cow_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Cow price cannot be negative.')
        return round(value)

    def validate_buffalo_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Buffalo price cannot be negative.')
        return round(value)

    def validate_email(self, value):
        email = value.lower()
        if not email.endswith('@gmail.com'):
            raise serializers.ValidationError("Only Gmail addresses are accepted.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("This email is already registered. Please login.")
        return email

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters.")
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value

    def validate_phone_number(self, value):
        import re
        if not re.match(r'^03\d{9}$', value):
            raise serializers.ValidationError("Phone number must be exactly 11 digits and start with '03'")
        
        # Allow signup if phone exists as a placeholder 'tmp_' user
        existing = User.objects.filter(phone_number=value).first()
        if existing and not existing.username.startswith('tmp_'):
            raise serializers.ValidationError("This phone number is already in use by an active account.")
        return value

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        password = validated_data.pop('password')
        phone_number = validated_data.get('phone_number')
        cow_price = validated_data.get('cow_price', 0)
        buffalo_price = validated_data.get('buffalo_price', 0)
        
        # Map full_name to first_name for AbstractUser usage
        # Set the username implicitly as the phone_number
        user = User.objects.create_user(
            username=phone_number,
            first_name=full_name,
            password=password,
            **validated_data
        )
        # Ensure prices are explicitly set/saved if create_user didn't catch them
        user.cow_price = cow_price
        user.buffalo_price = buffalo_price
        user.save()
        return user

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError("Invalid UID")

        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError("Invalid or expired token")

        return data

class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ('id', 'email', 'role', 'token', 'is_used', 'created_at', 'expires_at')
        read_only_fields = ('token', 'is_used', 'created_at', 'expires_at')
        extra_kwargs = {
            'email': {'required': False, 'allow_null': True, 'allow_blank': True}
        }

    def create(self, validated_data):
        validated_data['token'] = str(uuid.uuid4())
        validated_data['expires_at'] = timezone.now() + timedelta(days=7)
        return super().create(validated_data)

class InvitationSignupSerializer(serializers.ModelSerializer):
    token = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('token', 'email', 'password', 'full_name', 'phone_number', 'license_number', 'milk_type', 'daily_quantity', 'house_no', 'street', 'area', 'city', 'address', 'latitude', 'longitude')
        extra_kwargs = {
            'license_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'milk_type': {'required': False, 'allow_blank': True, 'allow_null': True},
            'daily_quantity': {'required': False, 'allow_null': True},
            'house_no': {'required': False, 'allow_blank': True, 'allow_null': True},
            'street': {'required': False, 'allow_blank': True, 'allow_null': True},
            'area': {'required': False, 'allow_blank': True, 'allow_null': True},
            'city': {'required': False, 'allow_blank': True, 'allow_null': True},
            'phone_number': {'required': True, 'validators': []},
            'email': {'required': True, 'validators': []},
        }

    def validate_token(self, value):
        try:
            invitation = Invitation.objects.get(token=value, is_used=False)
            if invitation.expires_at < timezone.now():
                raise serializers.ValidationError("Invitation token has expired.")
            return value
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("Invalid or used invitation token.")

    def validate_email(self, value):
        email = value.lower()
        if not email.endswith('@gmail.com'):
            raise serializers.ValidationError("Only Gmail addresses are accepted.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("This email is already registered. Please login.")
        return email

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters.")
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value

    def validate_phone_number(self, value):
        import re
        if not re.match(r'^03\d{9}$', value):
            raise serializers.ValidationError("Phone number must be exactly 11 digits and start with '03'")
        
        # Allow signup if phone exists as a placeholder 'tmp_' user
        existing = User.objects.filter(phone_number=value).first()
        if existing and not existing.username.startswith('tmp_'):
            raise serializers.ValidationError("This phone number is already in use by an active account.")
        return value

    def create(self, validated_data):
        token = validated_data.pop('token')
        password = validated_data.pop('password')
        full_name = validated_data.pop('full_name')
        phone_number = validated_data.get('phone_number')
        
        invitation = Invitation.objects.get(token=token)
        role = invitation.role

        # Try to find a pre-created record by the owner
        existing_user = User.objects.filter(phone_number=phone_number, username__startswith='tmp_').first()

        if existing_user:
            # Update the existing placeholder user
            existing_user.username = phone_number # Move away from tmp_
            existing_user.first_name = full_name
            existing_user.set_password(password)
            existing_user.role = role
            existing_user.parent_owner = invitation.invited_by
            # Update other provided fields
            for attr, val in validated_data.items():
                setattr(existing_user, attr, val)
            existing_user.save()
            user = existing_user
        else:
            # Traditional create
            user = User.objects.create_user(
                username=phone_number,
                first_name=full_name,
                password=password,
                role=role,
                parent_owner=invitation.invited_by,
                **validated_data
            )
        
        invitation.is_used = True
        invitation.save()
        
        return user

class RouteSerializer(serializers.ModelSerializer):
    customer_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    driver_name = serializers.SerializerMethodField()
    customer_count = serializers.SerializerMethodField()
    assigned_customer_ids = serializers.SerializerMethodField()
    customer_details = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = ('id', 'name', 'driver', 'driver_name', 'customer_ids', 'assigned_customer_ids', 'customer_count', 'customer_details', 'total_quantity', 'created_at')

    def get_driver_name(self, obj):
        return obj.driver.first_name if obj.driver else "No Driver"

    def get_customer_count(self, obj):
        return obj.customers.count()

    def get_assigned_customer_ids(self, obj):
        return list(obj.customers.values_list('id', flat=True))

    def get_customer_details(self, obj):
        return list(obj.customers.values('id', 'first_name', 'username'))

    def get_total_quantity(self, obj):
        from django.db.models import Sum
        total = obj.customers.aggregate(total=Sum('daily_quantity'))['total']
        return float(total) if total else 0.0

    def create(self, validated_data):
        customer_ids = validated_data.pop('customer_ids', [])
        route = Route.objects.create(**validated_data)
        if customer_ids:
            # Assign these customers to the new route
            User.objects.filter(id__in=customer_ids, role='customer', parent_owner=route.owner).update(route=route)
        return route

    def update(self, instance, validated_data):
        customer_ids = validated_data.pop('customer_ids', None)
        route = super().update(instance, validated_data)
        if customer_ids is not None:
            # Reset previous customers of this route
            User.objects.filter(route=route).update(route=None)
            # Assign new ones
            User.objects.filter(id__in=customer_ids, role='customer', parent_owner=route.owner).update(route=route)
        return route

class DeliverySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.first_name', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    customer_house_no = serializers.CharField(source='customer.house_no', read_only=True)
    customer_street = serializers.CharField(source='customer.street', read_only=True)
    customer_area = serializers.CharField(source='customer.area', read_only=True)
    customer_city = serializers.CharField(source='customer.city', read_only=True)
    customer_address = serializers.CharField(source='customer.address', read_only=True)
    customer_latitude = serializers.DecimalField(source='customer.latitude', max_digits=22, decimal_places=16, read_only=True)
    customer_longitude = serializers.DecimalField(source='customer.longitude', max_digits=22, decimal_places=16, read_only=True)
    customer_milk_type = serializers.CharField(source='customer.milk_type', read_only=True)
    customer_quantity = serializers.CharField(source='customer.daily_quantity', read_only=True)

    class Meta:
        model = Delivery
        fields = ('id', 'customer', 'customer_name', 'customer_username', 'customer_house_no', 'customer_street', 'customer_area', 'customer_city', 'customer_address', 'customer_latitude', 'customer_longitude', 'customer_milk_type', 'customer_quantity', 'route', 'date', 'is_delivered', 'status', 'delivered_at', 'quantity', 'price_at_delivery', 'total_amount')
        read_only_fields = ('delivered_at', 'total_amount')

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('Quantity cannot be negative.')
        if value == -0:
            return 0
        return value

    def validate_price_at_delivery(self, value):
        if value < 0:
            raise serializers.ValidationError('Price cannot be negative.')
        return value

class DeliveryAdjustmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.first_name', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    
    class Meta:
        model = DeliveryAdjustment
        fields = ('id', 'customer', 'customer_name', 'customer_username', 'date', 'adjustment_type', 'new_quantity', 'message', 'status', 'driver_comment', 'created_at', 'updated_at')
        read_only_fields = ('customer', 'status', 'driver_comment', 'created_at', 'updated_at')

    def validate_new_quantity(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('New quantity cannot be negative.')
        return value

    def validate_message(self, value):
        from django.utils.html import strip_tags
        return strip_tags(value).strip()

class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.first_name', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ('id', 'customer', 'customer_name', 'customer_username', 'amount', 'method', 'status', 'created_at', 'confirmed_at', 'date', 'note', 'received_by_name')
        read_only_fields = ('status', 'created_at', 'confirmed_at')
        extra_kwargs = {
            'customer': {'required': False}
        }

    def get_received_by_name(self, obj):
        if obj.received_by:
            return obj.received_by.first_name or obj.received_by.username
        return "System/User"

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError('Payment amount cannot be negative.')
        return value


class ManualCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'phone_number', 'house_no', 'street', 'area', 'city', 'address', 'latitude', 'longitude', 'milk_type', 'daily_quantity', 'route')

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value

class DailyReportSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.first_name', read_only=True)
    driver_username = serializers.CharField(source='driver.username', read_only=True)
    dairy_name = serializers.CharField(source='driver.parent_owner.dairy_name', read_only=True)

    class Meta:
        model = DailyReport
        fields = ('id', 'driver', 'driver_name', 'driver_username', 'dairy_name', 'date', 'total_milk', 'total_cash', 'customers_served', 'total_customers', 'created_at')
        read_only_fields = ('driver', 'date', 'total_milk', 'total_cash', 'customers_served', 'total_customers', 'created_at')
