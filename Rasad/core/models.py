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
