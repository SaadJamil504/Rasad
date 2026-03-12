from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Route, Customer

User = get_user_model()

class RouteTests(APITestCase):
    # ... (existing code)
    def setUp(self):
        # Create a driver and a non-driver
        self.driver = User.objects.create_user(
            username='driver1',
            password='password123',
            role='driver',
            phone_number='03001112233'
        )
        self.customer_user = User.objects.create_user(
            username='customer1',
            password='password123',
            role='customer',
            phone_number='03004445566'
        )
        self.route = Route.objects.create(name='Gulberg Route')

    def test_create_route(self):
        url = reverse('route-list')
        data = {'name': 'Johar Town Route'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Route.objects.count(), 2)

    def test_assign_driver_success(self):
        url = reverse('route-assign-driver', kwargs={'pk': self.route.pk})
        data = {'driver_id': self.driver.id}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.route.refresh_from_db()
        self.assertEqual(self.route.driver, self.driver)

    def test_assign_driver_invalid_role(self):
        url = reverse('route-assign-driver', kwargs={'pk': self.route.pk})
        data = {'driver_id': self.customer_user.id}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('driver_id', response.data)

class CustomerTests(APITestCase):
    def setUp(self):
        self.route = Route.objects.create(name='Cantt Route')
        self.customer_data = {
            'full_name': 'Ali Khan',
            'phone_number': '03009998888',
            'route': self.route.id,
            'milk_type': 'buffalo',
            'daily_qty': 2.50,
            'rate_per_liter': 180.00,
            'status': 'active'
        }

    def test_create_customer(self):
        url = reverse('customer-list')
        response = self.client.post(url, self.customer_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Customer.objects.count(), 1)
        self.assertEqual(Customer.objects.get().full_name, 'Ali Khan')

    def test_get_customer_profile(self):
        customer = Customer.objects.create(
            full_name='Ahmed', 
            phone_number='123', 
            route=self.route, 
            daily_qty=1, 
            rate_per_liter=100
        )
        url = reverse('customer-profile', kwargs={'pk': customer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Ahmed')
        self.assertEqual(response.data['route_name'], 'Cantt Route')

    def test_update_customer_status(self):
        customer = Customer.objects.create(
            full_name='Ahmed', 
            phone_number='123', 
            route=self.route, 
            daily_qty=1, 
            rate_per_liter=100,
            status='active'
        )
        url = reverse('customer-detail', kwargs={'pk': customer.pk})
        response = self.client.patch(url, {'status': 'paused'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customer.refresh_from_db()
        self.assertEqual(customer.status, 'paused')
