from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate, TruncMonth, ExtractHour
from django.utils.dateparse import parse_date

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from appointments.models import Appointment


class AdminReportBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def check_admin(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "Only administrators can access reports."},
                status=403,
            )

        return None

    def get_date_range(self, request):
        from_date = parse_date(request.query_params.get("from", ""))
        to_date = parse_date(request.query_params.get("to", ""))

        if from_date and not to_date:
            to_date = from_date

        if to_date and not from_date:
            from_date = to_date

        if from_date and to_date and from_date > to_date:
            raise ValueError("'from' date cannot be after 'to' date.")

        return from_date, to_date

    def filtered_appointments(self, request):
        queryset = Appointment.objects.select_related(
            "customer__user",
            "staff__user",
            "service",
        )

        from_date, to_date = self.get_date_range(request)

        if from_date:
            queryset = queryset.filter(
                appointment_date__gte=from_date
            )

        if to_date:
            queryset = queryset.filter(
                appointment_date__lte=to_date
            )

        return queryset, from_date, to_date


# ============================================================
# ADMIN DASHBOARD REPORT
# ============================================================

class AdminDashboardReportView(AdminReportBaseView):
    """
    Executive KPI dashboard.

    Optional query parameters:
        from=YYYY-MM-DD
        to=YYYY-MM-DD
    """

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        try:
            appointments, from_date, to_date = self.filtered_appointments(
                request
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=400
            )

        total = appointments.count()

        completed = appointments.filter(
            status=Appointment.Status.COMPLETED
        ).count()

        scheduled = appointments.filter(
            status=Appointment.Status.SCHEDULED
        ).count()

        cancelled = appointments.filter(
            status=Appointment.Status.CANCELLED
        ).count()

        rescheduled = appointments.filter(
            status=Appointment.Status.RESCHEDULED
        ).count()

        revenue = appointments.filter(
            status=Appointment.Status.COMPLETED
        ).aggregate(
            total=Sum("service__price")
        )["total"] or 0

        customer_queryset = User.objects.filter(
            role=User.Role.CUSTOMER
        )

        if from_date:
            customer_queryset = customer_queryset.filter(
                created_at__date__gte=from_date
            )

        if to_date:
            customer_queryset = customer_queryset.filter(
                created_at__date__lte=to_date
            )

        cancellation_rate = (
            round((cancelled / total) * 100, 2)
            if total
            else 0
        )

        completion_rate = (
            round((completed / total) * 100, 2)
            if total
            else 0
        )

        return Response({
            "period": {
                "from": from_date,
                "to": to_date,
            },
            "kpis": {
                "total_appointments": total,
                "completed": completed,
                "scheduled": scheduled,
                "cancelled": cancelled,
                "rescheduled": rescheduled,
                "completion_rate": completion_rate,
                "cancellation_rate": cancellation_rate,
                "total_revenue": revenue,
                "new_customers": customer_queryset.count(),
            },
        })


# ============================================================
# DAILY / DATE-WISE APPOINTMENT REPORT
# ============================================================

class DailyAppointmentReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        try:
            appointments, from_date, to_date = self.filtered_appointments(
                request
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=400
            )

        if not from_date or not to_date:
            return Response(
                {
                    "detail": "'from' and 'to' query parameters are required."
                },
                status=400,
            )

        rows = (
            appointments
            .annotate(
                day=TruncDate("appointment_date")
            )
            .values("day")
            .annotate(
                total=Count("id"),

                completed=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.COMPLETED
                    ),
                ),

                scheduled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.SCHEDULED
                    ),
                ),

                cancelled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.CANCELLED
                    ),
                ),

                rescheduled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.RESCHEDULED
                    ),
                ),
            )
            .order_by("day")
        )

        data = [
            {
                "date": row["day"],
                "total": row["total"],
                "completed": row["completed"],
                "scheduled": row["scheduled"],
                "cancelled": row["cancelled"],
                "rescheduled": row["rescheduled"],
            }
            for row in rows
        ]

        return Response({
            "period": {
                "from": from_date,
                "to": to_date,
            },
            "data": data,
        })


# ============================================================
# MONTHLY APPOINTMENT REPORT
# ============================================================

class MonthlyAppointmentReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        year = request.query_params.get("year")

        if not year:
            return Response(
                {
                    "detail": "'year' query parameter is required."
                },
                status=400,
            )

        try:
            year = int(year)

            if year < 2000 or year > 2100:
                raise ValueError

        except ValueError:
            return Response(
                {
                    "detail": "'year' must be a valid year."
                },
                status=400,
            )

        appointments = Appointment.objects.filter(
            appointment_date__year=year
        )

        rows = (
            appointments
            .annotate(
                month=TruncMonth("appointment_date")
            )
            .values("month")
            .annotate(
                total=Count("id"),

                completed=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.COMPLETED
                    ),
                ),

                scheduled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.SCHEDULED
                    ),
                ),

                cancelled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.CANCELLED
                    ),
                ),

                rescheduled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.RESCHEDULED
                    ),
                ),
            )
            .order_by("month")
        )

        data = [
            {
                "month": row["month"].strftime("%B"),
                "month_number": row["month"].month,
                "total": row["total"],
                "completed": row["completed"],
                "scheduled": row["scheduled"],
                "cancelled": row["cancelled"],
                "rescheduled": row["rescheduled"],
            }
            for row in rows
        ]

        return Response({
            "year": year,
            "data": data,
        })


# ============================================================
# DATE RANGE APPOINTMENT REPORT
# ============================================================

class DateRangeAppointmentReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        try:
            appointments, from_date, to_date = self.filtered_appointments(
                request
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=400
            )

        if not from_date or not to_date:
            return Response(
                {
                    "detail": "'from' and 'to' query parameters are required."
                },
                status=400,
            )

        total = appointments.count()

        completed = appointments.filter(
            status=Appointment.Status.COMPLETED
        ).count()

        scheduled = appointments.filter(
            status=Appointment.Status.SCHEDULED
        ).count()

        cancelled = appointments.filter(
            status=Appointment.Status.CANCELLED
        ).count()

        rescheduled = appointments.filter(
            status=Appointment.Status.RESCHEDULED
        ).count()

        return Response({
            "period": {
                "from": from_date,
                "to": to_date,
            },
            "total_appointments": total,
            "completed": completed,
            "scheduled": scheduled,
            "cancelled": cancelled,
            "rescheduled": rescheduled,
            "completion_rate": (
                round((completed / total) * 100, 2)
                if total
                else 0
            ),
            "cancellation_rate": (
                round((cancelled / total) * 100, 2)
                if total
                else 0
            ),
        })


# ============================================================
# DOCTOR PERFORMANCE REPORT
# ============================================================

class DoctorPerformanceReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        try:
            appointments, from_date, to_date = self.filtered_appointments(
                request
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=400
            )

        rows = (
            appointments
            .filter(
                staff__staff_type="DOCTOR"
            )
            .values(
                "staff__id",
                "staff__user__first_name",
                "staff__user__last_name",
            )
            .annotate(
                total=Count("id"),

                completed=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.COMPLETED
                    ),
                ),

                scheduled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.SCHEDULED
                    ),
                ),

                cancelled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.CANCELLED
                    ),
                ),

                rescheduled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.RESCHEDULED
                    ),
                ),
            )
            .order_by("-total")
        )

        data = []

        for row in rows:
            total = row["total"]

            data.append({
                "doctor_id": row["staff__id"],

                "doctor_name": (
                    f'{row["staff__user__first_name"]} '
                    f'{row["staff__user__last_name"]}'
                ).strip(),

                "total_appointments": total,
                "completed": row["completed"],
                "scheduled": row["scheduled"],
                "cancelled": row["cancelled"],
                "rescheduled": row["rescheduled"],

                "completion_rate": (
                    round(
                        (row["completed"] / total) * 100,
                        2
                    )
                    if total
                    else 0
                ),
            })

        return Response({
            "period": {
                "from": from_date,
                "to": to_date,
            },
            "data": data,
        })


# ============================================================
# SERVICE UTILIZATION REPORT
# ============================================================

class ServiceUtilizationReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        try:
            appointments, from_date, to_date = self.filtered_appointments(
                request
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=400
            )

        rows = (
            appointments
            .values(
                "service__id",
                "service__name",
            )
            .annotate(
                appointments=Count("id"),

                completed=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.COMPLETED
                    ),
                ),

                cancelled=Count(
                    "id",
                    filter=Q(
                        status=Appointment.Status.CANCELLED
                    ),
                ),

                revenue=Sum(
                    "service__price",
                    filter=Q(
                        status=Appointment.Status.COMPLETED
                    ),
                ),
            )
            .order_by("-appointments")
        )

        data = [
            {
                "service_id": row["service__id"],
                "service_name": row["service__name"],
                "appointments": row["appointments"],
                "completed": row["completed"],
                "cancelled": row["cancelled"],
                "revenue": row["revenue"] or 0,
            }
            for row in rows
        ]

        return Response({
            "period": {
                "from": from_date,
                "to": to_date,
            },
            "data": data,
        })


# ============================================================
# CANCELLATION REPORT
# ============================================================

class CancellationReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        try:
            appointments, from_date, to_date = self.filtered_appointments(
                request
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=400
            )

        total = appointments.count()

        cancelled = appointments.filter(
            status=Appointment.Status.CANCELLED
        ).count()

        by_date = (
            appointments
            .filter(
                status=Appointment.Status.CANCELLED
            )
            .annotate(
                day=TruncDate("appointment_date")
            )
            .values("day")
            .annotate(
                total=Count("id")
            )
            .order_by("day")
        )

        by_doctor = (
            appointments
            .filter(
                status=Appointment.Status.CANCELLED
            )
            .values(
                "staff__id",
                "staff__user__first_name",
                "staff__user__last_name",
            )
            .annotate(
                total=Count("id")
            )
            .order_by("-total")
        )

        return Response({
            "period": {
                "from": from_date,
                "to": to_date,
            },

            "total_cancelled": cancelled,

            "cancellation_rate": (
                round(
                    (cancelled / total) * 100,
                    2
                )
                if total
                else 0
            ),

            "by_date": [
                {
                    "date": row["day"],
                    "cancelled": row["total"],
                }
                for row in by_date
            ],

            "by_doctor": [
                {
                    "doctor_id": row["staff__id"],

                    "doctor_name": (
                        f'{row["staff__user__first_name"]} '
                        f'{row["staff__user__last_name"]}'
                    ).strip(),

                    "cancelled": row["total"],
                }
                for row in by_doctor
            ],
        })


# ============================================================
# PEAK HOURS REPORT
# ============================================================

class PeakHoursReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        date_text = request.query_params.get("date")

        if not date_text:
            return Response(
                {
                    "detail": "'date' query parameter is required."
                },
                status=400,
            )

        selected_date = parse_date(date_text)

        if not selected_date:
            return Response(
                {
                    "detail": "'date' must be in YYYY-MM-DD format."
                },
                status=400,
            )

        appointments = Appointment.objects.filter(
            appointment_date=selected_date
        )

        rows = (
            appointments
            .annotate(
                hour=ExtractHour("start_time")
            )
            .values("hour")
            .annotate(
                appointments=Count("id")
            )
            .order_by(
                "-appointments",
                "hour"
            )
        )

        return Response({
            "date": selected_date,

            "peak_hours": [
                {
                    "hour": f"{row['hour']:02d}:00",
                    "appointments": row["appointments"],
                }
                for row in rows
            ],
        })


# ============================================================
# REVENUE REPORT
# ============================================================

class RevenueReportView(AdminReportBaseView):

    def get(self, request):
        denied = self.check_admin(request)

        if denied:
            return denied

        try:
            appointments, from_date, to_date = self.filtered_appointments(
                request
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=400
            )

        completed = appointments.filter(
            status=Appointment.Status.COMPLETED
        )

        summary = completed.aggregate(
            total_revenue=Sum("service__price"),
            completed_appointments=Count("id"),
        )

        total_revenue = summary["total_revenue"] or 0
        completed_count = summary["completed_appointments"] or 0

        service_rows = (
            completed
            .values(
                "service__id",
                "service__name",
            )
            .annotate(
                appointments=Count("id"),
                revenue=Sum("service__price"),
            )
            .order_by("-revenue")
        )

        return Response({
            "period": {
                "from": from_date,
                "to": to_date,
            },

            "completed_appointments": completed_count,

            "total_revenue": total_revenue,

            "average_revenue_per_appointment": (
                round(
                    float(total_revenue) / completed_count,
                    2
                )
                if completed_count
                else 0
            ),

            "service_breakdown": [
                {
                    "service_id": row["service__id"],
                    "service_name": row["service__name"],
                    "appointments": row["appointments"],
                    "revenue": row["revenue"] or 0,
                }
                for row in service_rows
            ],
        })