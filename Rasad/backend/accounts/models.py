from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
import uuid

class User(AbstractUser):
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('driver', 'Driver'),
        ('customer', 'Customer'),
    )

    alphabet_only = RegexValidator(
        regex=r'^[a-zA-Z\s]+$',
        message='Dairy Name must only contain alphabets and spaces.'
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    parent_owner = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff')
    license_number = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    dairy_name = models.CharField(max_length=100, null=True, blank=True, help_text="For Owner users",validators=[alphabet_only])
    
    # Pricing fields
    buffalo_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    cow_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    
    # Customer specific fields
    milk_type = models.CharField(max_length=20, choices=[('cow', 'Cow'), ('buffalo', 'Buffalo'), ('both', 'Both')], null=True, blank=True)
    daily_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    route = models.ForeignKey('Route', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    
    # Balance fields
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    outstanding_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=[('driver', 'Driver'), ('customer', 'Customer')])
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invitation for {self.role} by {self.invited_by.username}"

class Route(models.Model):
    name = models.CharField(max_length=100)
    # Changed related_name from 'routes' to 'owned_routes' to avoid clash
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_routes')
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Delivery(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('paused', 'Paused'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deliveries')
    driver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_deliveries')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    price_at_delivery = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])

    class Meta:
        unique_together = ('customer', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Delivery for {self.customer.username} on {self.date} - {self.get_status_display()}"

class Payment(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    date = models.DateField(default=timezone.now)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='collected_payments')
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment of {self.amount} by {self.customer.username}"

class DeliveryAdjustment(models.Model):
    ADJUSTMENT_TYPES = (
        ('pause', 'Pause Delivery'),
        ('quantity', 'Change Quantity'),
        ('complaint', 'Complaint'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    )
    
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='adjustments')
    date = models.DateField()
    adjustment_type = models.CharField(max_length=20, choices=ADJUSTMENT_TYPES)
    new_quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    message = models.TextField(null=True, blank=True, help_text="Message for the driver")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    driver_comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer', 'date']),
            models.Index(fields=['status']),
        ]
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.get_adjustment_type_display()} request by {self.customer.username} for {self.date}"