from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, Customer, Staff


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    model = User

    ordering = ("email",)

    list_display = (
        "id",
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
        "created_at",
    )

    list_filter = (
        "role",
        "is_active",
        "is_staff",
    )

    search_fields = (
        "email",
        "first_name",
        "last_name",
    )

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "password",
                )
            },
        ),
        (
            "Personal Information",
            {
                "fields": (
                    "first_name",
                    "last_name",
                )
            },
        ),
        (
            "Role & Permissions",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important Dates",
            {
                "fields": (
                    "last_login",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    readonly_fields = (
        "last_login",
        "created_at",
        "updated_at",
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "get_email",
        "get_full_name",
        "phone",
        "is_active",
        "created_at",
    )

    list_filter = (
        "user__is_active",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "phone",
    )

    ordering = (
        "-created_at",
    )

    @admin.display(
        description="Email"
    )
    def get_email(self, obj):
        return obj.user.email

    @admin.display(
        description="Name"
    )
    def get_full_name(self, obj):
        return (
            f"{obj.user.first_name} "
            f"{obj.user.last_name}"
        )

    @admin.display(
        description="Active"
    )
    def is_active(self, obj):
        return obj.user.is_active


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "staff_type",
        "designation",
        "department",
        "phone",
        "is_available",
        "created_at",
    )

    list_filter = (
        "staff_type",
        "department",
        "is_available",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "phone",
    )

    filter_horizontal = (
        "services",
    )

    ordering = (
        "-created_at",
    )

    @admin.display(
        description="Email"
    )
    def get_email(self, obj):
        return obj.user.email

    @admin.display(
        description="Name"
    )
    def get_full_name(self, obj):
        return (
            f"{obj.user.first_name} "
            f"{obj.user.last_name}"
        )