from rest_framework import serializers
from .models import Route, Customer
from accounts.serializers import UserSerializer

class RouteSerializer(serializers.ModelSerializer):
    driver_details = UserSerializer(source='driver', read_only=True)

    class Meta:
        model = Route
        fields = ('id', 'name', 'driver', 'driver_details')

class AssignDriverSerializer(serializers.Serializer):
    driver_id = serializers.IntegerField()

    def validate_driver_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(pk=value)
            if user.role != 'driver':
                raise serializers.ValidationError("User is not a driver.")
        except User.DoesNotExist:
            raise serializers.ValidationError("Driver not found.")
        return value

class CustomerSerializer(serializers.ModelSerializer):
    route_name = serializers.CharField(source='route.name', read_only=True)

    class Meta:
        model = Customer
        fields = (
            'id', 'user', 'full_name', 'phone_number', 'route', 
            'route_name', 'milk_type', 'daily_qty', 'rate_per_liter', 
            'status', 'created_at'
        )
        read_only_fields = ('created_at',)
