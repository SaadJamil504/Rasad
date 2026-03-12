from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Route, Customer
from .serializers import RouteSerializer, AssignDriverSerializer, CustomerSerializer

class RouteViewSet(viewsets.ModelViewSet):
    # ... (existing code)
    queryset = Route.objects.all()
    serializer_class = RouteSerializer

    @extend_schema(
        request=AssignDriverSerializer,
        responses={200: RouteSerializer},
        description="Assign a driver to a route."
    )
    @action(detail=True, methods=['patch'], url_path='assign-driver')
    def assign_driver(self, request, pk=None):
        route = self.get_object()
        serializer = AssignDriverSerializer(data=request.data)
        if serializer.is_valid():
            from django.contrib.auth import get_user_model
            User = get_user_model()
            driver = User.objects.get(pk=serializer.validated_data['driver_id'])
            route.driver = driver
            route.save()
            return Response(RouteSerializer(route).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    @extend_schema(
        responses={200: CustomerSerializer},
        description="Get detailed profile of a customer."
    )
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        customer = self.get_object()
        serializer = self.get_serializer(customer)
        return Response(serializer.data)
