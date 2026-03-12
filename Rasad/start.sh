#!/bin/bash
python manage.py migrate
gunicorn Rasad.wsgi:application --bind 0.0.0.0:$PORT