from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Route

User = get_user_model()

class RouteTests(APITestCase):
    def setUp(self):
        # Create a driver and a non-driver
        self.driver = User.objects.create_user(
            username='driver1',
            password='password123',
            role='driver',
            phone_number='03001112233'
        )
        self.customer = User.objects.create_user(
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
        data = {'driver_id': self.customer.id}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('driver_id', response.data)
