from pathlib import Path
from datetime import timedelta


# ============================================================
# BASE DIRECTORY
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# SECURITY
# ============================================================

SECRET_KEY = "django-insecure-y!0i9^)qzudk7%ddb6m44tzgrvek9-)x*j2^2(1#con*j1)z^)"

DEBUG = True

ALLOWED_HOSTS = []


# ============================================================
# INSTALLED APPS
# ============================================================

INSTALLED_APPS = [
    # Django built-in apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",


    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",

    # Local apps
    "accounts",
    "appointments",
    "services",
     "reports",
]


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",

    "corsheaders.middleware.CorsMiddleware",
]


# ============================================================
# URL CONFIGURATION
# ============================================================

ROOT_URLCONF = "config.urls"


# ============================================================
# TEMPLATES
# ============================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [
            BASE_DIR / "templates",
        ],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [

                "django.template.context_processors.request",

                "django.contrib.auth.context_processors.auth",

                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ============================================================
# WSGI
# ============================================================

WSGI_APPLICATION = "config.wsgi.application"


# ============================================================
# DATABASE
# ============================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",

        "NAME": "appointment_booking_db",

        "USER": "",

        "PASSWORD": "",

        "HOST": "localhost",

        "PORT": "3307",
    }
}


# ============================================================
# CUSTOM USER MODEL
# ============================================================

AUTH_USER_MODEL = "accounts.User"


# ============================================================
# PASSWORD VALIDATION
# ============================================================

AUTH_PASSWORD_VALIDATORS = [

    {
        "NAME":
        "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },

    {
        "NAME":
        "django.contrib.auth.password_validation.MinimumLengthValidator",
    },

    {
        "NAME":
        "django.contrib.auth.password_validation.CommonPasswordValidator",
    },

    {
        "NAME":
        "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ============================================================
# INTERNATIONALIZATION
# ============================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# ============================================================
# STATIC FILES
# ============================================================

STATIC_URL = "static/"

STATICFILES_DIRS = [
    BASE_DIR / "static",
]


# ============================================================
# MEDIA FILES
# ============================================================

MEDIA_URL = "media/"

MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# EMAIL CONFIGURATION
# ============================================================
# Development configuration.
# Emails will appear in the terminal instead of being sent.

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {

    # --------------------------------------------------------
    # Authentication
    # --------------------------------------------------------

    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],

    # --------------------------------------------------------
    # Default permission
    # --------------------------------------------------------
    # Every API requires authentication by default.
    #
    # Public APIs such as registration and login will explicitly
    # use:
    #
    # permission_classes = [AllowAny]
    #
    # Role-specific APIs will explicitly use:
    #
    # IsAdmin
    # IsStaff
    # IsCustomer
    # --------------------------------------------------------

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],

    # --------------------------------------------------------
    # API pagination
    # --------------------------------------------------------

    "DEFAULT_PAGINATION_CLASS":
        "rest_framework.pagination.PageNumberPagination",

    "PAGE_SIZE": 10,
}


# ============================================================
# SIMPLE JWT CONFIGURATION
# ============================================================

SIMPLE_JWT = {

    # Access token validity
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=30
    ),

    # Refresh token validity
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=7
    ),

    # Generate a new refresh token when refreshing
    "ROTATE_REFRESH_TOKENS": True,

    # Old refresh token becomes invalid
    "BLACKLIST_AFTER_ROTATION": True,

    # JWT header format
    #
    # Authorization:
    # Bearer <access_token>
    #
    "AUTH_HEADER_TYPES": (
        "Bearer",
    ),

    # User ID stored inside token
    "USER_ID_FIELD": "id",

    "USER_ID_CLAIM": "user_id",

    # Authentication class used by DRF
    "AUTH_TOKEN_CLASSES": (
        "rest_framework_simplejwt.tokens.AccessToken",
    ),

    "TOKEN_TYPE_CLAIM": "token_type",
}


# ============================================================
# DEFAULT PRIMARY KEY
# ============================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
CORS_ALLOW_ALL_ORIGINS = True