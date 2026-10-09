from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from .models import Service
from .serializers import ServiceSerializer

from accounts.models import Staff
from .serializers import ServiceSerializer, DoctorSerializer


class ServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer

    def get_queryset(self):
        user = self.request.user

        # Admin can see all services
        if user.role == "ADMIN":
            return Service.objects.all().order_by("name")

        # Customers and Staff can see only active services
        return Service.objects.filter(
            is_active=True
        ).order_by("name")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]

        return [IsAuthenticated()]


class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    queryset = Service.objects.all()

    def get_permissions(self):
        if self.request.method in ["PATCH", "PUT", "DELETE"]:
            return [IsAdmin()]

        return [IsAuthenticated()]

class ServiceDoctorsView(generics.ListAPIView):
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        service_id = self.kwargs["pk"]

        return Staff.objects.filter(
            services__id=service_id,
            staff_type=Staff.StaffType.DOCTOR,
            is_available=True,
            user__is_active=True,
        ).select_related("user").order_by(
            "user__first_name",
            "user__last_name",
        )