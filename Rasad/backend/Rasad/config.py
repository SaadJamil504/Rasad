# Set to False for local development, True for production
IS_PRODUCTION = True

CONFIG = {
    'local': {
        'DEBUG': True,
        'FRONTEND_URL': 'http://localhost:5173',
        'ALLOWED_HOSTS': ['localhost', '127.0.0.1'],
    },
    'production': {
        'DEBUG': False,
        'FRONTEND_URL': 'https://rasad-ten.vercel.app',
        'ALLOWED_HOSTS': ['rasad-production.up.railway.app', 'localhost', '127.0.0.1'],
    }
}

active_config = CONFIG['production'] if IS_PRODUCTION else CONFIG['local']

DEBUG = active_config['DEBUG']
FRONTEND_URL = active_config['FRONTEND_URL']
ALLOWED_HOSTS = active_config['ALLOWED_HOSTS']

# Common Settings
SECRET_KEY = 'django-insecure-#7ei!^x5=kwmq2(wdlvb$)=1v7c(x=!=o07hnpfwfrgelf_6#2'
