# Generated migration to add missing fields

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_alter_user_dairy_name'),
    ]

    operations = [
        # Add missing fields to Delivery model
        migrations.AddField(
            model_name='delivery',
            name='is_delivered',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='delivery',
            name='delivered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='delivery',
            name='route',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='deliveries', to='accounts.route'),
        ),
        # Add missing fields to Payment model
        migrations.AddField(
            model_name='payment',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('rejected', 'Rejected')], default='pending', max_length=20),
        ),
        migrations.AddField(
            model_name='payment',
            name='confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Add driver field to Route model
        migrations.AddField(
            model_name='route',
            name='driver',
            field=models.ForeignKey(blank=True, help_text='Assigned Driver for this route', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_route', to=settings.AUTH_USER_MODEL),
        ),
    ]
