from rest_framework import serializers
from .models import Route
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
