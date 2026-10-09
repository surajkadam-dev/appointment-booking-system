from rest_framework.permissions import BasePermission

from accounts.models import User


class IsAdmin(BasePermission):
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsAdminOrStaff(BasePermission):
    message = "Only administrators or staff members can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                User.Role.ADMIN,
                User.Role.STAFF,
            ]
        )


class IsCustomer(BasePermission):
    message = "Only customers can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.CUSTOMER
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
                    and request.user.staff_profile.staff_type
                    == "RECEPTIONIST"
                )
            )
        )


class IsAdminOrDoctor(BasePermission):
    message = "Only administrators or doctors can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and (
                request.user.role == User.Role.ADMIN
                or (
                    request.user.role == User.Role.STAFF
                    and hasattr(request.user, "staff_profile")
                    and request.user.staff_profile.staff_type
                    == "DOCTOR"
                )
            )
        )