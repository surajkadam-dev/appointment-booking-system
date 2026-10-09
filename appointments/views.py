from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    IsAdminOrStaff,
    IsCustomer,
  
)

from .permissions import (
    IsAdminOrReceptionist,
    IsAdminOrDoctor,
)
from accounts.models import User, Staff

from .models import Availability, Appointment

from .serializers import (
    AvailabilitySerializer,
    AppointmentSerializer,
    CancelAppointmentSerializer,
    RescheduleAppointmentSerializer,
    StaffAppointmentSerializer,
)


# ============================================================
# AVAILABILITY
# ============================================================
class AvailabilityListCreateView(generics.ListCreateAPIView):

    serializer_class = AvailabilitySerializer

    # ================================================================
    # QUERYSET
    # ================================================================

    def get_queryset(self):

        user = self.request.user

        # Base queryset
        queryset = Availability.objects.select_related(
            "staff__user"
        )

        # ============================================================
        # OPTIONAL STAFF FILTER
        # ============================================================

        staff_id = self.request.query_params.get("staff")

        if staff_id:
            queryset = queryset.filter(
                staff_id=staff_id
            )

        # ============================================================
        # ADMIN
        # ============================================================

        if user.role == "ADMIN":

            return queryset.order_by(
                "staff",
                "day_of_week",
                "start_time"
            )

        # ============================================================
        # STAFF
        # ============================================================

        if user.role == "STAFF":

            # --------------------------------------------------------
            # RECEPTIONIST
            # --------------------------------------------------------
            # Receptionist manages doctor availability,
            # therefore receptionist can see all availability.
            # --------------------------------------------------------

            if (
                hasattr(user, "staff_profile")
                and user.staff_profile.staff_type == "RECEPTIONIST"
            ):

                return queryset.order_by(
                    "staff",
                    "day_of_week",
                    "start_time"
                )

            # --------------------------------------------------------
            # DOCTOR / OTHER STAFF
            # --------------------------------------------------------
            # They can see only their own availability.
            # --------------------------------------------------------

            return queryset.filter(
                staff__user=user
            ).order_by(
                "day_of_week",
                "start_time"
            )

        # ============================================================
        # CUSTOMER
        # ============================================================

        if user.role == "CUSTOMER":

            return queryset.filter(
                is_available=True
            ).order_by(
                "staff",
                "day_of_week",
                "start_time"
            )

        # ============================================================
        # UNKNOWN ROLE
        # ============================================================

        return Availability.objects.none()

    # ================================================================
    # PERMISSIONS
    # ================================================================

    def get_permissions(self):

        # Everyone authenticated can VIEW availability.
        if self.request.method == "GET":

            return [
                IsAuthenticated()
            ]

        # Admin or Staff can CREATE availability.
        return [
            IsAdminOrStaff()
        ]

class AvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = AvailabilitySerializer

    # ================================================================
    # QUERYSET
    # ================================================================

    def get_queryset(self):

        user = self.request.user

        # ------------------------------------------------------------
        # ADMIN
        # ------------------------------------------------------------
        # Admin can access all availability records.
        # ------------------------------------------------------------

        if user.role == "ADMIN":

            return Availability.objects.select_related(
                "staff__user"
            )

        # ------------------------------------------------------------
        # STAFF
        # ------------------------------------------------------------

        if user.role == "STAFF":

            # --------------------------------------------------------
            # RECEPTIONIST
            # --------------------------------------------------------
            # Receptionist manages doctor availability,
            # so receptionist can access all availability records.
            # --------------------------------------------------------

            if (
                hasattr(user, "staff_profile")
                and user.staff_profile.staff_type == "RECEPTIONIST"
            ):

                return Availability.objects.select_related(
                    "staff__user"
                )

            # --------------------------------------------------------
            # DOCTOR / OTHER STAFF
            # --------------------------------------------------------
            # They can access only their own availability.
            # --------------------------------------------------------

            return Availability.objects.filter(
                staff__user=user
            ).select_related(
                "staff__user"
            )

        # ------------------------------------------------------------
        # CUSTOMER
        # ------------------------------------------------------------
        # Customer can view only active availability.
        # ------------------------------------------------------------

        if user.role == "CUSTOMER":

            return Availability.objects.filter(
                is_available=True
            ).select_related(
                "staff__user"
            )

        # ------------------------------------------------------------
        # UNKNOWN ROLE
        # ------------------------------------------------------------

        return Availability.objects.none()

    # ================================================================
    # PERMISSIONS
    # ================================================================

    def get_permissions(self):

        # ------------------------------------------------------------
        # GET
        # ------------------------------------------------------------
        # Everyone authenticated can view availability.
        # ------------------------------------------------------------

        if self.request.method == "GET":

            return [
                IsAuthenticated()
            ]

        # ------------------------------------------------------------
        # PATCH / PUT / DELETE
        # ------------------------------------------------------------
        # Admin and Staff can update/delete.
        # ------------------------------------------------------------

        return [
            IsAdminOrStaff()
        ]
# ============================================================
# CUSTOMER APPOINTMENT BOOKING
# ============================================================

class AppointmentListCreateView(generics.ListCreateAPIView):

    serializer_class = AppointmentSerializer

    def get_permissions(self):

        if self.request.method == "POST":
            return [IsCustomer()]

        return [IsAuthenticated()]

    def get_queryset(self):

        user = self.request.user

        queryset = Appointment.objects.select_related(
            "customer__user",
            "staff__user",
            "service"
        ).all()

        # =========================
        # ADMIN
        # =========================

        if user.role == User.Role.ADMIN:

            return queryset


        # =========================
        # STAFF
        # =========================

        if user.role == User.Role.STAFF:

            # Doctor
            if (
                hasattr(user, "staff_profile")
                and user.staff_profile.staff_type == Staff.StaffType.DOCTOR
            ):

                return queryset.filter(
                    staff__user=user
                )


            # Receptionist
            if (
                hasattr(user, "staff_profile")
                and user.staff_profile.staff_type
                == Staff.StaffType.RECEPTIONIST
            ):

                return queryset


            # Other Staff
            return queryset.filter(
                staff__user=user
            )


        # =========================
        # CUSTOMER
        # =========================

        if user.role == User.Role.CUSTOMER:

            return queryset.filter(
                customer__user=user
            )


        # =========================
        # UNKNOWN
        # =========================

        return Appointment.objects.none()
# ============================================================
# ADMIN / RECEPTIONIST BOOKING
# ============================================================

class StaffAppointmentCreateView(generics.CreateAPIView):
    """
    Allows Admin or Receptionist to create an appointment
    on behalf of a customer.
    """

    serializer_class = StaffAppointmentSerializer
    permission_classes = [IsAdminOrReceptionist]


# ============================================================
# APPOINTMENT DETAIL
# ============================================================
class AppointmentDetailView(generics.RetrieveAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # ADMIN → can view any appointment
        if user.role == "ADMIN":
            return Appointment.objects.select_related(
                "customer__user",
                "staff__user",
                "service"
            )

        # STAFF
        if user.role == "STAFF":

            # RECEPTIONIST → can view any appointment
            if (
                hasattr(user, "staff_profile")
                and user.staff_profile.staff_type == "RECEPTIONIST"
            ):
                return Appointment.objects.select_related(
                    "customer__user",
                    "staff__user",
                    "service"
                )

            # DOCTOR / OTHER STAFF → only assigned appointments
            return Appointment.objects.filter(
                staff__user=user
            ).select_related(
                "customer__user",
                "staff__user",
                "service"
            )

        # CUSTOMER → only own appointments
        if user.role == "CUSTOMER":
            return Appointment.objects.filter(
                customer__user=user
            ).select_related(
                "customer__user",
                "staff__user",
                "service"
            )

        return Appointment.objects.none()
# ============================================================
# CANCEL APPOINTMENT
# ============================================================

class AppointmentCancelView(generics.GenericAPIView):
    serializer_class = CancelAppointmentSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        try:
            appointment = Appointment.objects.select_related(
                "customer__user",
                "staff__user",
                "service"
            ).get(pk=pk)

        except Appointment.DoesNotExist:
            return Response(
                {
                    "detail": "Appointment not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user

        # ADMIN can cancel any appointment
        if user.role == "ADMIN":
            pass

        # STAFF can cancel only assigned appointments
        elif user.role == "STAFF":

            if appointment.staff.user_id != user.id:
                return Response(
                    {
                        "detail":
                        "You can cancel only your assigned appointments."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        # CUSTOMER can cancel only their own appointments
        elif user.role == "CUSTOMER":

            if appointment.customer.user_id != user.id:
                return Response(
                    {
                        "detail":
                        "You can cancel only your own appointments."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        else:
            return Response(
                {
                    "detail":
                    "You do not have permission to cancel appointments."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(
            data=request.data,
            context={
                "appointment": appointment
            }
        )

        serializer.is_valid(raise_exception=True)

        appointment.status = Appointment.Status.CANCELLED

        appointment.cancellation_reason = (
            serializer.validated_data["cancellation_reason"]
        )

        appointment.save(
            update_fields=[
                "status",
                "cancellation_reason",
                "updated_at"
            ]
        )

        return Response(
            {
                "message": "Appointment cancelled successfully.",
                "appointment_id": appointment.id,
                "status": appointment.status,
                "cancellation_reason":
                    appointment.cancellation_reason,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# RESCHEDULE APPOINTMENT
# ============================================================

class AppointmentRescheduleView(generics.GenericAPIView):
    serializer_class = RescheduleAppointmentSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        try:
            appointment = Appointment.objects.select_related(
                "customer__user",
                "staff__user",
                "service"
            ).get(pk=pk)

        except Appointment.DoesNotExist:
            return Response(
                {
                    "detail": "Appointment not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user

        # ADMIN → can reschedule any appointment
        if user.role == "ADMIN":
            pass

        # STAFF
        elif user.role == "STAFF":

            # RECEPTIONIST → can reschedule any appointment
            if (
                hasattr(user, "staff_profile")
                and user.staff_profile.staff_type == "RECEPTIONIST"
            ):
                pass

            # DOCTOR / OTHER STAFF → assigned appointments only
            elif appointment.staff.user_id != user.id:
                return Response(
                    {
                        "detail":
                        "You can reschedule only your assigned appointments."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        # CUSTOMER → own appointments only
        elif user.role == "CUSTOMER":

            if appointment.customer.user_id != user.id:
                return Response(
                    {
                        "detail":
                        "You can reschedule only your own appointments."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        else:
            return Response(
                {
                    "detail":
                    "You do not have permission to reschedule appointments."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(
            data=request.data,
            context={
                "appointment": appointment
            }
        )

        serializer.is_valid(raise_exception=True)

        appointment.appointment_date = (
            serializer.validated_data["appointment_date"]
        )

        appointment.start_time = (
            serializer.validated_data["start_time"]
        )

        from datetime import datetime, timedelta

        start_datetime = datetime.combine(
            appointment.appointment_date,
            appointment.start_time
        )

        end_datetime = start_datetime + timedelta(
            minutes=appointment.service.duration
        )

        appointment.end_time = end_datetime.time()

        appointment.status = Appointment.Status.RESCHEDULED

        appointment.save()

        return Response(
            {
                "message":
                    "Appointment rescheduled successfully.",
                "appointment":
                    AppointmentSerializer(appointment).data,
            },
            status=status.HTTP_200_OK
        )

# ============================================================
# COMPLETE APPOINTMENT
# ============================================================

class AppointmentCompleteView(APIView):
    """
    Admin can complete any appointment.
    Doctor can complete only their assigned appointment.
    """

    permission_classes = [IsAdminOrDoctor]

    def post(self, request, pk):

        try:
            appointment = Appointment.objects.select_related(
                "customer__user",
                "staff__user",
                "service"
            ).get(pk=pk)

        except Appointment.DoesNotExist:
            return Response(
                {
                    "detail": "Appointment not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Doctor can complete only their assigned appointment
        if (
            request.user.role == "STAFF"
            and appointment.staff.user_id != request.user.id
        ):
            return Response(
                {
                    "detail":
                    "You can complete only your assigned appointments."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Cancelled appointment cannot be completed
        if appointment.status == Appointment.Status.CANCELLED:
            return Response(
                {
                    "detail":
                    "Cancelled appointments cannot be completed."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Already completed
        if appointment.status == Appointment.Status.COMPLETED:
            return Response(
                {
                    "detail":
                    "This appointment is already completed."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        appointment.status = Appointment.Status.COMPLETED

        appointment.save(
            update_fields=[
                "status",
                "updated_at"
            ]
        )

        return Response(
            {
                "message":
                    "Appointment completed successfully.",
                "appointment":
                    AppointmentSerializer(appointment).data,
            },
            status=status.HTTP_200_OK
        )