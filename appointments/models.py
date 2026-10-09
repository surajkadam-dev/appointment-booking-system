from django.db import models

from accounts.models import Customer, Staff
from services.models import Service


class Availability(models.Model):

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name="availabilities"
    )

    day_of_week = models.IntegerField(
        choices=DayOfWeek.choices
    )

    start_time = models.TimeField()

    end_time = models.TimeField()

    is_available = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = [
            "day_of_week",
            "start_time"
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "staff",
                    "day_of_week",
                    "start_time",
                    "end_time"
                ],
                name="unique_staff_availability"
            )
        ]

    def __str__(self):
        return (
            f"{self.staff} - "
            f"{self.get_day_of_week_display()} "
            f"{self.start_time} - "
            f"{self.end_time}"
        )


class Appointment(models.Model):

    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        RESCHEDULED = "RESCHEDULED", "Rescheduled"

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="appointments"
    )

    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name="appointments"
    )

    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name="appointments"
    )

    appointment_date = models.DateField()

    start_time = models.TimeField()

    end_time = models.TimeField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED
    )

    reason = models.TextField(
        blank=True,
        null=True
    )

    cancellation_reason = models.TextField(
        blank=True,
        null=True
    )
    cancelled_at = models.DateTimeField(
    null=True,
    blank=True,
)

    completed_at = models.DateTimeField(
    null=True,
    blank=True,
     )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )
    

    class Meta:
        ordering = [
            "appointment_date",
            "start_time"
        ]

    def __str__(self):
        return (
            f"{self.customer} - "
            f"{self.service.name} - "
            f"{self.appointment_date} "
            f"{self.start_time}"
        )