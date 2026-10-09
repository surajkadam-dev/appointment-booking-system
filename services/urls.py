from django.urls import path
from .views import ServiceListCreateView, ServiceDetailView

from .views import ServiceDoctorsView
urlpatterns = [
    path(
        "",
        ServiceListCreateView.as_view(),
        name="service-list-create"
    ),
    path(
        "<int:pk>/",
        ServiceDetailView.as_view(),
        name="service-detail"
    ),
    path("<int:pk>/doctors/", ServiceDoctorsView.as_view(), name="service-doctors"),
]