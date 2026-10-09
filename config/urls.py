from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/accounts/", include("accounts.urls")),

    path("api/appointments/", include("appointments.urls")),

    path("api/services/", include("services.urls")),
    path("api/reports/", include("reports.urls")),
]