from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Customer, Staff
from services.models import Service


class CustomerRegistrationSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    phone = serializers.CharField(
        write_only=True
    )

    address = serializers.CharField(
        required=False,
        allow_blank=True
    )

    date_of_birth = serializers.DateField(
        required=False,
        allow_null=True
    )

    class Meta:
        model = User

        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "address",
            "date_of_birth",
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def validate_phone(self, value):
        if Customer.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                "A customer with this phone number already exists."
            )

        return value

    @transaction.atomic
    def create(self, validated_data):

        phone = validated_data.pop("phone")

        address = validated_data.pop(
            "address",
            ""
        )

        date_of_birth = validated_data.pop(
            "date_of_birth",
            None
        )

        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            role=User.Role.CUSTOMER,
            is_staff=False,
            is_active=True,
            **validated_data
        )

        Customer.objects.create(
            user=user,
            phone=phone,
            address=address,
            date_of_birth=date_of_birth
        )

        return user


class CustomTokenObtainPairSerializer(
    TokenObtainPairSerializer
):

    @classmethod
    def get_token(cls, user):

        token = super().get_token(user)

        token["user_id"] = user.id
        token["email"] = user.email
        token["role"] = user.role

        return token

    def validate(self, attrs):

        data = super().validate(attrs)

        user_data = {
            "id": self.user.id,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "role": self.user.role,
        }

        # =========================
        # STAFF INFORMATION
        # =========================

        if self.user.role == User.Role.STAFF:

            try:
                staff = self.user.staff_profile

                user_data["staff_id"] = staff.id
                user_data["staff_type"] = staff.staff_type
                user_data["designation"] = staff.designation
                user_data["department"] = staff.department

            except Staff.DoesNotExist:

                user_data["staff_id"] = None
                user_data["staff_type"] = None
                user_data["designation"] = None
                user_data["department"] = None

        # =========================
        # CUSTOMER INFORMATION
        # =========================

        elif self.user.role == User.Role.CUSTOMER:

            try:
                customer = self.user.customer_profile

                user_data["customer_id"] = customer.id

            except Customer.DoesNotExist:

                user_data["customer_id"] = None

        data["user"] = user_data

        return data
class StaffCreateSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    phone = serializers.CharField(
        write_only=True
    )

    staff_type = serializers.ChoiceField(
        choices=Staff.StaffType.choices
    )

    designation = serializers.CharField(
        required=False,
        write_only=True,
        allow_blank=True
    )

    department = serializers.CharField(
        required=False,
        write_only=True,
        allow_blank=True
    )

    services = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        many=True,
        required=False
    )

    class Meta:
        model = User

        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "staff_type",
            "designation",
            "department",
            "services",
        ]

    def validate_email(self, value):

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def validate_phone(self, value):

        if Staff.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                "A staff member with this phone number already exists."
            )

        return value

    @transaction.atomic
    def create(self, validated_data):

        phone = validated_data.pop("phone")

        staff_type = validated_data.pop(
            "staff_type"
        )

        designation = validated_data.pop(
            "designation",
            ""
        )

        department = validated_data.pop(
            "department",
            ""
        )

        password = validated_data.pop("password")

        services = validated_data.pop(
            "services",
            []
        )

        user = User.objects.create_user(
            password=password,
            role=User.Role.STAFF,
            is_staff=False,
            is_active=True,
            **validated_data
        )

        staff = Staff.objects.create(
            user=user,
            phone=phone,
            staff_type=staff_type,
            designation=designation,
            department=department
        )

        staff.services.set(services)

        return user
class StaffManagementSerializer(serializers.ModelSerializer):

    name = serializers.SerializerMethodField()

    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True
    )

    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True
    )

    is_active = serializers.BooleanField(
        source="user.is_active",
        read_only=True
    )

    role = serializers.CharField(
        source="user.role",
        read_only=True
    )

    class Meta:
        model = Staff

        fields = [
            "id",
            "name",
            "email",
            "first_name",
            "last_name",
            "phone",
            "staff_type",
            "designation",
            "department",
            "services",
            "is_available",
            "is_active",
            "role",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "name",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "role",
            "created_at",
            "updated_at",
        ]

    def get_name(self, obj):
        return (
            f"{obj.user.first_name} "
            f"{obj.user.last_name}"
        ).strip()

class CustomerManagementSerializer(
    serializers.ModelSerializer
):

    email = serializers.EmailField(
        source="user.email"
    )

    first_name = serializers.CharField(
        source="user.first_name"
    )

    last_name = serializers.CharField(
        source="user.last_name"
    )

    is_active = serializers.BooleanField(
        source="user.is_active"
    )

    role = serializers.CharField(
        source="user.role",
        read_only=True
    )

    class Meta:
        model = Customer

        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "address",
            "date_of_birth",
            "is_active",
            "role",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "role",
            "created_at",
            "updated_at",
        ]

    def validate_email(self, value):

        user = (
            self.instance.user
            if self.instance
            else None
        )

        existing_user = (
            User.objects
            .filter(email=value)
            .first()
        )

        if existing_user and existing_user != user:
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def validate_phone(self, value):

        customer_id = (
            self.instance.id
            if self.instance
            else None
        )

        existing_customer = (
            Customer.objects
            .filter(phone=value)
            .first()
        )

        if (
            existing_customer
            and existing_customer.id != customer_id
        ):
            raise serializers.ValidationError(
                "A customer with this phone number already exists."
            )

        return value

    def update(
        self,
        instance,
        validated_data
    ):

        user_data = validated_data.pop(
            "user",
            {}
        )

        user = instance.user

        if "email" in user_data:
            user.email = user_data["email"]

        if "first_name" in user_data:
            user.first_name = user_data["first_name"]

        if "last_name" in user_data:
            user.last_name = user_data["last_name"]

        if "is_active" in user_data:
            user.is_active = user_data["is_active"]

        user.role = User.Role.CUSTOMER

        user.save()

        instance = super().update(
            instance,
            validated_data
        )

        return instance