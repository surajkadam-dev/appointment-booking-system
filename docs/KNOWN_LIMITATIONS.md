# Known Limitations

This document lists the remaining limitations identified in the current implementation and testing of the Appointment & Booking Management System.

## 1. Recurring availability only

The current availability system supports recurring weekly working hours for staff.

One-time staff leave, holidays, and date-specific availability overrides are not implemented. For example, the system can define that a doctor is available every Monday from 09:00 to 17:00, but it does not currently provide a separate leave/holiday management feature for blocking a particular Monday.

## 2. Daily report date field

The daily appointment report is returning the correct aggregate appointment counts, but the grouped `date` field currently appears as `null`.

The report calculation itself is working, but the date-grouping/output field needs to be corrected so that each result contains its corresponding appointment date.

## 3. Cancellation report date field

The cancellation report returns the correct cancellation total, cancellation rate, and doctor-wise cancellation statistics.

However, the `by_date.date` field currently appears as `null`. The date-wise grouping/output needs to be corrected.

## 4. No online payment integration

Service prices are stored in the system and completed appointment revenue is included in the reporting module.

However, an online payment gateway, transaction tracking, payment confirmation, and refund workflow are not implemented in the current version.

## 5. No automated appointment notifications

The current system does not include automated email, SMS, or WhatsApp notifications for:

- Appointment confirmation
- Appointment cancellation
- Appointment rescheduling
- Appointment reminders

These can be added as a future enhancement if notification requirements are introduced.

## Summary

The core appointment workflow, role-based access, staff/service management, recurring availability, appointment validation, cancellation, rescheduling, completion, and reporting features are implemented.

The limitations above are mainly additional features or remaining reporting-output issues rather than blockers for the core booking workflow.
