from django.db import models
from django.conf import settings

class Route(models.Model):
    name = models.CharField(max_length=100, unique=True)
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='routes',
        limit_choices_to={'role': 'driver'}
    )

    def __str__(self):
        return self.name

class Customer(models.Model):
    MILK_TYPES = (
        ('buffalo', 'Buffalo'),
        ('cow', 'Cow'),
    )
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('paused', 'Paused'),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customer_profile'
    )
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15)
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='customers'
    )
    milk_type = models.CharField(max_length=10, choices=MILK_TYPES, default='buffalo')
    daily_qty = models.DecimalField(max_digits=5, decimal_places=2, help_text="Quantity in liters")
    rate_per_liter = models.DecimalField(max_digits=7, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.route.name})"
