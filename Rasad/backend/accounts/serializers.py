from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Invitation, Route
import uuid
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect Credentials")

class UserSerializer(serializers.ModelSerializer):
    owner_dairy_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'phone_number', 'first_name', 'license_number', 'milk_type', 'daily_quantity', 'address', 'dairy_name', 'owner_dairy_name', 'route')

    def get_owner_dairy_name(self, obj):
        if obj.role == 'owner':
            return obj.dairy_name
        if obj.parent_owner:
            return obj.parent_owner.dairy_name
        return None

class SignupSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'full_name', 'phone_number', 'email', 'role', 'address', 'dairy_name')
        extra_kwargs = {
            'phone_number': {'required': True},
            'email': {'required': False},
        }

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        password = validated_data.pop('password')
        
        # Map full_name to first_name for AbstractUser usage
        user = User.objects.create_user(
            first_name=full_name,
            password=password,
            **validated_data
        )
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

    def create(self, validated_data):
        validated_data['token'] = str(uuid.uuid4())
        validated_data['expires_at'] = timezone.now() + timezone.timedelta(days=7)
        return super().create(validated_data)

class InvitationSignupSerializer(serializers.ModelSerializer):
    token = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('token', 'username', 'password', 'full_name', 'phone_number', 'license_number', 'milk_type', 'daily_quantity', 'address')

    def validate_token(self, value):
        try:
            invitation = Invitation.objects.get(token=value, is_used=False)
            if invitation.expires_at < timezone.now():
                raise serializers.ValidationError("Invitation token has expired.")
            return value
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("Invalid or used invitation token.")

    def create(self, validated_data):
        token = validated_data.pop('token')
        password = validated_data.pop('password')
        full_name = validated_data.pop('full_name')
        
        invitation = Invitation.objects.get(token=token)
        
        user = User.objects.create_user(
            first_name=full_name,
            password=password,
            role=invitation.role,
            parent_owner=invitation.owner,
            email=invitation.email,
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

    class Meta:
        model = Route
        fields = ('id', 'name', 'driver', 'driver_name', 'customer_ids', 'customer_count', 'created_at')

    def get_driver_name(self, obj):
        return obj.driver.first_name if obj.driver else "No Driver"

    def get_customer_count(self, obj):
        return obj.customers.count()

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
