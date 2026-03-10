from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class AuthTests(APITestCase):
    def test_signup(self):
        url = reverse('signup')
        data = {
            'username': 'newuser',
            'password': 'password123',
            'full_name': 'New User Account',
            'phone_number': '03009998888',
            'role': 'owner'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().first_name, 'New User Account')
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_signup_missing_fields(self):
        url = reverse('signup')
        data = {
            'username': 'newuser2',
            'password': 'password123',
            # Missing full_name and phone_number
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('full_name', response.data)
        self.assertIn('phone_number', response.data)

    def test_login(self):
        # ... (existing code remains)
        User.objects.create_user(
            username='user1', 
            password='password123', 
            first_name='User One',
            phone_number='03007776666'
        )
        url = reverse('login')
        data = {
            'username': 'user1',
            'password': 'password123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['username'], 'user1')

    def test_password_reset_flow(self):
        user = User.objects.create_user(
            username='resetuser',
            password='oldpassword123',
            email='reset@example.com',
            phone_number='03004445555'
        )
        
        # 1. Request Reset
        url_request = reverse('password_reset_request')
        response_request = self.client.post(url_request, {'email': 'reset@example.com'}, format='json')
        self.assertEqual(response_request.status_code, status.HTTP_200_OK)
        uid = response_request.data['uid']
        token = response_request.data['token']

        # 2. Confirm Reset
        url_confirm = reverse('password_reset_confirm')
        data_confirm = {
            'uid': uid,
            'token': token,
            'new_password': 'newpassword123'
        }
        response_confirm = self.client.post(url_confirm, data_confirm, format='json')
        self.assertEqual(response_confirm.status_code, status.HTTP_200_OK)

        # 3. Verify Login with new password
        url_login = reverse('login')
        response_login = self.client.post(url_login, {'username': 'resetuser', 'password': 'newpassword123'}, format='json')
        self.assertEqual(response_login.status_code, status.HTTP_200_OK)
