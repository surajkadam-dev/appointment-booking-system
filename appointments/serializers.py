from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework import serializers

from accounts.models import Customer
from .models import Availability, Appointment


class AvailabilitySerializer(serializers.ModelSerializer):

    staff_name = serializers.SerializerMethodField()

    staff_type = serializers.CharField(
        source="staff.staff_type",
        read_only=True
    )

    day_name = serializers.CharField(
        source="get_day_of_week_display",
        read_only=True
    )

    class Meta:
        model = Availability

        fields = [
            "id",
            "staff",
            "staff_name",
            "staff_type",
            "day_of_week",
            "day_name",
            "start_time",
            "end_time",
            "is_available",
        ]

        read_only_fields = [
            "id",
            "staff_name",
            "staff_type",
            "day_name",
        ]

    def get_staff_name(self, obj):
        return (
            f"{obj.staff.user.first_name} "
            f"{obj.staff.user.last_name}"
        ).strip()

    def validate(self, attrs):

        start_time = attrs.get(
            "start_time",
            getattr(self.instance, "start_time", None)
        )

        end_time = attrs.get(
            "end_time",
            getattr(self.instance, "end_time", None)
        )

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                "end_time":
                    "End time must be later than start time."
            })

        return attrs
class AppointmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    staff_name = serializers.SerializerMethodField()
    staff_type = serializers.CharField(
        source="staff.staff_type",
        read_only=True
    )
    service_name = serializers.CharField(
        source="service.name",
        read_only=True
    )
    service_duration = serializers.IntegerField(
        source="service.duration",
        read_only=True
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "customer",
            "customer_name",
            "staff",
            "staff_name",
            "staff_type",
            "service",
            "service_name",
            "service_duration",
            "appointment_date",
            "start_time",
            "end_time",
            "status",
            "reason",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "customer",
            "customer_name",
            "staff_name",
            "staff_type",
            "service_name",
            "service_duration",
            "end_time",
            "status",
            "created_at",
            "updated_at",
        ]
    def get_customer_name(self, obj):
        return f"{obj.customer.user.first_name} {obj.customer.user.last_name}".strip()

    def get_staff_name(self, obj):
        return f"{obj.staff.user.first_name} {obj.staff.user.last_name}".strip()        

    def validate(self, attrs):
        appointment_date = attrs.get("appointment_date")
        start_time = attrs.get("start_time")
        staff = attrs.get("staff")
        service = attrs.get("service")

        if not appointment_date:
            raise serializers.ValidationError({
                "appointment_date": "Appointment date is required."
            })

        if not start_time:
            raise serializers.ValidationError({
                "start_time": "Start time is required."
            })

        if not staff:
            raise serializers.ValidationError({
                "staff": "Staff is required."
            })

        if not service:
            raise serializers.ValidationError({
                "service": "Service is required."
            })

        self.validate_appointment_slot(
            appointment_date,
            start_time,
            staff,
            service
        )

        return attrs

    def validate_appointment_slot(
        self,
        appointment_date,
        start_time,
        staff,
        service,
        exclude_appointment_id=None
    ):

        today = timezone.localdate()

        # Prevent past dates
        if appointment_date < today:
            raise serializers.ValidationError({
                "appointment_date":
                    "Appointments cannot be booked for a past date."
            })

        # Prevent booking in the past on today's date
        if appointment_date == today:
            current_time = timezone.localtime().time().replace(
                second=0,
                microsecond=0
            )

            if start_time <= current_time:
                raise serializers.ValidationError({
                    "start_time":
                        "Appointments cannot be booked in the past."
                })

        # Staff availability
        if not staff.is_available:
            raise serializers.ValidationError({
                "staff":
                    "This staff member is currently unavailable."
            })

        # Service availability
        if not service.is_active:
            raise serializers.ValidationError({
                "service":
                    "This service is currently inactive."
            })

        # Find staff working schedule for selected day
        day_of_week = appointment_date.weekday()

        availability = Availability.objects.filter(
            staff=staff,
            day_of_week=day_of_week,
            is_available=True
        )

        if not availability.exists():
            raise serializers.ValidationError({
                "appointment_date":
                    "Staff is not available on this day."
            })

        # Calculate appointment end time automatically
        start_datetime = datetime.combine(
            appointment_date,
            start_time
        )

        end_datetime = start_datetime + timedelta(
            minutes=service.duration
        )

        end_time = end_datetime.time()

        # Check working hours
        within_working_hours = False

        for schedule in availability:
            if (
                start_time >= schedule.start_time
                and end_time <= schedule.end_time
            ):
                within_working_hours = True
                break

        if not within_working_hours:
            raise serializers.ValidationError({
                "start_time":
                    "Appointment time is outside staff working hours."
            })

        # Prevent overlapping appointments
        overlapping = Appointment.objects.filter(
            staff=staff,
            appointment_date=appointment_date,
            status__in=[
                Appointment.Status.SCHEDULED,
                Appointment.Status.RESCHEDULED,
            ],
            start_time__lt=end_time,
            end_time__gt=start_time,
        )

        if exclude_appointment_id:
            overlapping = overlapping.exclude(
                id=exclude_appointment_id
            )

        if overlapping.exists():
            raise serializers.ValidationError({
                "start_time":
                    "This time slot overlaps with another appointment."
            })

        return end_time

    def create(self, validated_data):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        if not hasattr(request.user, "customer_profile"):
            raise serializers.ValidationError(
                "Only customers can create appointments."
            )

        validated_data["customer"] = request.user.customer_profile

        appointment_date = validated_data["appointment_date"]
        start_time = validated_data["start_time"]
        service = validated_data["service"]

        start_datetime = datetime.combine(
            appointment_date,
            start_time
        )

        end_datetime = start_datetime + timedelta(
            minutes=service.duration
        )

        validated_data["end_time"] = end_datetime.time()
        validated_data["status"] = Appointment.Status.SCHEDULED

        return Appointment.objects.create(**validated_data)


class CancelAppointmentSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True
    )

    def validate_cancellation_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Cancellation reason is required."
            )

        return value.strip()
    def validate(self, attrs):
     appointment = self.context["appointment"]

     if appointment.status in [
        Appointment.Status.CANCELLED,
        Appointment.Status.COMPLETED,
     ]:
        raise serializers.ValidationError(
            "This appointment cannot be cancelled."
        )

     # Cancellation must be at least 1 hour before appointment start
     now = timezone.localtime()

     appointment_start = timezone.make_aware(
        datetime.combine(
            appointment.appointment_date,
            appointment.start_time
        ),
        timezone.get_current_timezone()
     )

     cancellation_deadline = appointment_start - timedelta(hours=1)

     if now > cancellation_deadline:
        raise serializers.ValidationError(
            "Appointments can only be cancelled at least 1 hour before the scheduled start time."
        )

     return attrs

class RescheduleAppointmentSerializer(serializers.Serializer):
    appointment_date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=True)

    def validate(self, attrs):
        appointment = self.context["appointment"]

        if appointment.status in [
            Appointment.Status.CANCELLED,
            Appointment.Status.COMPLETED,
        ]:
            raise serializers.ValidationError(
                "This appointment cannot be rescheduled."
            )

        appointment_serializer = AppointmentSerializer()

        appointment_serializer.validate_appointment_slot(
            appointment_date=attrs["appointment_date"],
            start_time=attrs["start_time"],
            staff=appointment.staff,
            service=appointment.service,
            exclude_appointment_id=appointment.id
        )

        return attrs

class StaffAppointmentSerializer(AppointmentSerializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=True
    )

    class Meta(AppointmentSerializer.Meta):
        fields = AppointmentSerializer.Meta.fields

        read_only_fields = [
            "id",
            "customer_name",
            "staff_name",
            "staff_type",
            "service_name",
            "service_duration",
            "end_time",
            "status",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        appointment_date = validated_data["appointment_date"]
        start_time = validated_data["start_time"]
        service = validated_data["service"]

        start_datetime = datetime.combine(
            appointment_date,
            start_time
        )

        end_datetime = start_datetime + timedelta(
            minutes=service.duration
        )

        validated_data["end_time"] = end_datetime.time()
        validated_data["status"] = Appointment.Status.SCHEDULED

        return Appointment.objects.create(**validated_data)