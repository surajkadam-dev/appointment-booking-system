from django.urls import path

from .views import (
    AdminDashboardReportView,
    DailyAppointmentReportView,
    MonthlyAppointmentReportView,
    DateRangeAppointmentReportView,
    DoctorPerformanceReportView,
    ServiceUtilizationReportView,
    CancellationReportView,
    PeakHoursReportView,
    RevenueReportView,
)

urlpatterns = [
    path("admin/dashboard/", AdminDashboardReportView.as_view(), name="admin-dashboard-report"),
    path("admin/appointments/daily/", DailyAppointmentReportView.as_view(), name="admin-daily-appointments"),
    path("admin/appointments/monthly/", MonthlyAppointmentReportView.as_view(), name="admin-monthly-appointments"),
    path("admin/appointments/date-range/", DateRangeAppointmentReportView.as_view(), name="admin-date-range-appointments"),
    path("admin/doctors/", DoctorPerformanceReportView.as_view(), name="admin-doctor-performance"),
    path("admin/services/", ServiceUtilizationReportView.as_view(), name="admin-service-utilization"),
    path("admin/cancellations/", CancellationReportView.as_view(), name="admin-cancellations"),
    path("admin/peak-hours/", PeakHoursReportView.as_view(), name="admin-peak-hours"),
    path("admin/revenue/", RevenueReportView.as_view(), name="admin-revenue"),
]
