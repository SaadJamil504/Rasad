from django.contrib.auth.models import AbstractUser
from django.db import models

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
    milk_type = models.CharField(max_length=20, choices=[('cow', 'Cow'), ('buffalo', 'Buffalo'), ('both', 'Both')], null=True, blank=True)
    daily_quantity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Daily milk quantity in liters")
    route = models.ForeignKey('Route', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers', help_text="Assigned route for Customers")

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
