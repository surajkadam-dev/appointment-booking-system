from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomerRegistrationView,
    LoginView,
    CurrentUserView,
    StaffCreateView,
    CustomerListView,
    CustomerDetailView,
    CustomerMeView,
StaffDetailView
)


urlpatterns = [

    # ========================================================
    # AUTHENTICATION
    # ========================================================

    path(
        "register/",
        CustomerRegistrationView.as_view(),
        name="customer-register"
    ),

    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh"
    ),

    path(
        "me/",
        CurrentUserView.as_view(),
        name="current-user"
    ),

    # ========================================================
    # STAFF MANAGEMENT
    # ========================================================

    path(
        "staff/",
        StaffCreateView.as_view(),
        name="staff-create"
    ),
    path(
    "staff/<int:pk>/",
    StaffDetailView.as_view(),
    name="staff-detail"
),

    # ========================================================
    # CUSTOMER MANAGEMENT - ADMIN
    # ========================================================

    path(
        "customers/",
        CustomerListView.as_view(),
        name="customer-list"
    ),

    path(
        "customers/<int:pk>/",
        CustomerDetailView.as_view(),
        name="customer-detail"
    ),

    # ========================================================
    # CUSTOMER OWN PROFILE
    # ========================================================

    path(
        "customer/me/",
        CustomerMeView.as_view(),
        name="customer-me"
    ),
]