from rest_framework.permissions import BasePermission

from .models import User


class IsAdmin(BasePermission):
    message = "Only administrators can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsStaff(BasePermission):
    message = "Only staff members can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.STAFF
        )


class IsCustomer(BasePermission):
    message = "Only customers can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.CUSTOMER
        )


class IsAdminOrStaff(BasePermission):
    message = "Only administrators or staff members can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                User.Role.ADMIN,
                User.Role.STAFF,
            ]
        )


class IsDoctor(BasePermission):
    message = "Only doctors can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.STAFF
            and hasattr(request.user, "staff_profile")
            and request.user.staff_profile.staff_type
            == "DOCTOR"
        )


class IsReceptionist(BasePermission):
    message = "Only receptionists can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.STAFF
            and hasattr(request.user, "staff_profile")
            and request.user.staff_profile.staff_type
            == "RECEPTIONIST"
        )


class IsDoctorOrReceptionist(BasePermission):
    message = "Only doctors or receptionists can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.STAFF
            and hasattr(request.user, "staff_profile")
            and request.user.staff_profile.staff_type
            in ["DOCTOR", "RECEPTIONIST"]
        )
class IsStaffOrAdmin(BasePermission):
    message = "Only administrators or staff members can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                User.Role.ADMIN,
                User.Role.STAFF,
            ]
        )    

class IsAdminOrReceptionist(BasePermission):
    message = "Only administrators or receptionists can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and (
                request.user.role == User.Role.ADMIN
                or (
                    request.user.role == User.Role.STAFF
                    and hasattr(request.user, "staff_profile")
                    and request.user.staff_profile.staff_type == "RECEPTIONIST"
                )
            )
        )