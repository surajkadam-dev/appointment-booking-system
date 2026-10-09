from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Customer, Staff,User
from .permissions import IsAdmin, IsCustomer,IsDoctorOrReceptionist,IsAdminOrReceptionist
from .serializers import (
    CustomerRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    StaffCreateSerializer,
    CustomerManagementSerializer,
    StaffManagementSerializer
)


class CustomerRegistrationView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = CustomerRegistrationSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.save()

            return Response(
                {
                    "message": "Customer registered successfully.",
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "role": user.role,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(TokenObtainPairView):

    permission_classes = [AllowAny]

    serializer_class = (
        CustomTokenObtainPairSerializer
    )

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        data = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        }

        # =====================================================
        # STAFF USER
        # =====================================================

        if user.role == User.Role.STAFF:

            try:
                staff = user.staff_profile

                data["staff_id"] = staff.id
                data["staff_type"] = staff.staff_type
                data["designation"] = staff.designation
                data["department"] = staff.department

            except Staff.DoesNotExist:

                data["staff_id"] = None
                data["staff_type"] = None
                data["designation"] = None
                data["department"] = None

        # =====================================================
        # CUSTOMER USER
        # =====================================================

        elif user.role == User.Role.CUSTOMER:

            try:
                customer = user.customer_profile

                data["customer_id"] = customer.id

            except Customer.DoesNotExist:

                data["customer_id"] = None

        return Response(data)
class StaffCreateView(APIView):
    def get_permissions(self):

        if self.request.method == "GET":
            return [IsAdminOrReceptionist()]

        if self.request.method == "POST":
            return [IsAdmin()]

        return [IsAdmin()]
  

    def get(self, request):

        staff_members = (
            Staff.objects
            .select_related("user")
            .prefetch_related("services")
            .order_by(
                "user__first_name",
                "user__last_name"
            )
        )

        serializer = StaffManagementSerializer(
            staff_members,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def post(self, request):

        serializer = StaffCreateSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.save()

            staff = user.staff_profile

            return Response(
                {
                    "message": "Staff created successfully.",
                    "staff": {
                        "id": user.id,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "role": user.role,
                        "staff_type": staff.staff_type,
                        "designation": staff.designation,
                        "department": staff.department,
                        "phone": staff.phone,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
class StaffDetailView(APIView):

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return (
                Staff.objects
                .select_related("user")
                .prefetch_related("services")
                .get(pk=pk)
            )
        except Staff.DoesNotExist:
            return None

    def get(self, request, pk):

        staff = self.get_object(pk)

        if staff is None:
            return Response(
                {"detail": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = StaffManagementSerializer(staff)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def patch(self, request, pk):

        staff = self.get_object(pk)

        if staff is None:
            return Response(
                {"detail": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = StaffManagementSerializer(
            staff,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                {
                    "message": "Staff updated successfully.",
                    "staff": serializer.data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):

        staff = self.get_object(pk)

        if staff is None:
            return Response(
                {"detail": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        user = staff.user

        staff.delete()
        user.delete()

        return Response(
            {"message": "Staff deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )

class CustomerListView(APIView):

    permission_classes = [IsAdminOrReceptionist]

    def get(self, request):

        customers = (
            Customer.objects
            .select_related("user")
            .order_by("-created_at")
        )

        serializer = CustomerManagementSerializer(
            customers,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


class CustomerDetailView(APIView):

    def get_permissions(self):

        if self.request.method in ["GET", "PATCH"]:
            return [IsAdminOrReceptionist()]

        return [IsAdmin()]

    def get_object(self, pk):

        try:
            return Customer.objects.select_related(
                "user"
            ).get(pk=pk)

        except Customer.DoesNotExist:
            return None

    def get(self, request, pk):

        customer = self.get_object(pk)

        if not customer:
            return Response(
                {"detail": "Customer not found."},
                status=404
            )

        serializer = CustomerManagementSerializer(
            customer
        )

        return Response(
            serializer.data,
            status=200
        )

    def patch(self, request, pk):

        customer = self.get_object(pk)

        if not customer:
            return Response(
                {"detail": "Customer not found."},
                status=404
            )

        serializer = CustomerManagementSerializer(
            customer,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data,
                status=200
            )

        return Response(
            serializer.errors,
            status=400
        )

    def delete(self, request, pk):

        customer = self.get_object(pk)

        if not customer:
            return Response(
                {"detail": "Customer not found."},
                status=404
            )

        user = customer.user

        customer.delete()
        user.delete()

        return Response(
            {"message": "Customer deleted successfully."},
            status=204
        )
class CustomerMeView(APIView):

    permission_classes = [IsCustomer]

    def get(self, request):

        customer = request.user.customer_profile

        serializer = CustomerManagementSerializer(
            customer
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def patch(self, request):

        customer = request.user.customer_profile

        serializer = CustomerManagementSerializer(
            customer,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                {
                    "message": "Profile updated successfully.",
                    "customer": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )