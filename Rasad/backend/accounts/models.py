from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('driver', 'Driver'),
        ('customer', 'Customer'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    parent_owner = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff')
    license_number = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    dairy_name = models.CharField(max_length=100, null=True, blank=True, help_text="For Owner users")
    buffalo_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cow_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    milk_type = models.CharField(max_length=20, choices=[('cow', 'Cow'), ('buffalo', 'Buffalo'), ('both', 'Both')], null=True, blank=True)
    daily_quantity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Daily milk quantity in liters")
    route = models.ForeignKey('Route', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers', help_text="Assigned route for Customers")
    outstanding_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class Route(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_routes')
    driver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_route', help_text="Assigned Driver for this route")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.owner.username}"

class Invitation(models.Model):
    email = models.EmailField(null=True, blank=True)
    token = models.CharField(max_length=100, unique=True)
    role = models.CharField(max_length=20, choices=User.ROLE_CHOICES)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"Invite for {self.email} as {self.role}"

class Payment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('rejected', 'Rejected'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Payment of {self.amount} by {self.customer.username} - {self.status}"

class Delivery(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'customer'}, related_name='deliveries')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='deliveries')
    date = models.DateField(default=timezone.now)
    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    price_at_delivery = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('customer', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Delivery for {self.customer.username} on {self.date} - {'Done' if self.is_delivered else 'Pending'}"
