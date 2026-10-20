import os
import tempfile
import uuid

from django.conf import settings
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import (
    UserProfile,
    ReferenceImage,
    EditingProfile,
    Project,
    Export,
    UploadedImage,
    DemoPrompt,
    FeatureExplanation,
    Regeneration,
)

from .serializers import (
    UserProfileSerializer,
    ReferenceImageSerializer,
    EditingProfileSerializer,
    ProjectSerializer,
    ExportSerializer,
    UploadedImageSerializer,
    DemoPromptSerializer,
    FeatureExplanationSerializer,
    RegenerationSerializer,
)

from .supabase_storage import supabase, BUCKET_NAME


# =========================================================
# USER PROFILE
# =========================================================

class UserProfileViewSet(viewsets.ModelViewSet):

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return UserProfile.objects.filter(
            id=self.request.user.id
        )

    http_method_names = [
        "get",
        "patch",
        "head",
        "options"
    ]


# =========================================================
# REFERENCE IMAGES
# =========================================================

class ReferenceImageViewSet(viewsets.ModelViewSet):

    serializer_class = ReferenceImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return ReferenceImage.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):

        serializer.save(
            user=self.request.user
        )


# =========================================================
# EDITING PROFILES
# =========================================================

class EditingProfileViewSet(viewsets.ModelViewSet):

    serializer_class = EditingProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return EditingProfile.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):

        serializer.save(
            user=self.request.user
        )


# =========================================================
# PROJECTS
# =========================================================

class ProjectViewSet(viewsets.ModelViewSet):

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Project.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):

        editing_profile = serializer.validated_data.get(
            "editing_profile"
        )

        if (
            editing_profile
            and editing_profile.user != self.request.user
        ):

            raise ValidationError({
                "editing_profile":
                "You do not own this editing profile."
            })

        serializer.save(
            user=self.request.user
        )


# =========================================================
# EXPORTS
# =========================================================

class ExportViewSet(viewsets.ModelViewSet):

    serializer_class = ExportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Export.objects.filter(
            project__user=self.request.user
        )

    def perform_create(self, serializer):

        project = serializer.validated_data.get(
            "project"
        )

        if project.user != self.request.user:

            raise ValidationError({
                "project":
                "You do not own this project."
            })

        serializer.save()


# =========================================================
# UPLOADED IMAGES
# =========================================================

class UploadedImageViewSet(viewsets.ModelViewSet):

    serializer_class = UploadedImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return UploadedImage.objects.filter(
            user=self.request.user
        )

    def create(self, request, *args, **kwargs):

        uploaded_file = request.FILES.get("image")

        if not uploaded_file:

            return Response(
                {
                    "error":
                    "Please upload an image."
                },
                status=400
            )

        image_type = request.data.get(
            "image_type",
            "original"
        )

        if image_type not in [
            "reference",
            "original"
        ]:

            return Response(
                {
                    "error":
                    "Invalid image_type."
                },
                status=400
            )

        # -------------------------------------------------
        # Save upload temporarily
        # -------------------------------------------------

        temp_file = tempfile.NamedTemporaryFile(
            suffix=os.path.splitext(
                uploaded_file.name
            )[1] or ".jpg",
            delete=False
        )

        temp_path = temp_file.name

        try:

            for chunk in uploaded_file.chunks():

                temp_file.write(chunk)

            temp_file.close()

            # -------------------------------------------------
            # Generate unique storage path
            # -------------------------------------------------

            filename = os.path.basename(
                uploaded_file.name
            )

            storage_path = (
                f"uploads/"
                f"{request.user.supabase_user_id}/"
                f"{uuid.uuid4().hex}_"
                f"{filename}"
            )

            # -------------------------------------------------
            # Read file
            # -------------------------------------------------

            with open(
                temp_path,
                "rb"
            ) as file:

                file_data = file.read()

            if supabase:
                supabase.storage.from_(
                    BUCKET_NAME
                ).upload(
                    storage_path,
                    file_data,
                    {
                        "content-type": uploaded_file.content_type or "image/jpeg",
                        "upsert": "true",
                    }
                )
            else:
                local_path = os.path.join(settings.MEDIA_ROOT, storage_path)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, "wb") as local_file:
                    local_file.write(file_data)

            # -------------------------------------------------
            # Create database record
            # -------------------------------------------------

            uploaded_image = UploadedImage.objects.create(
                user=request.user,
                image=storage_path,
                image_type=image_type
            )

            # -------------------------------------------------
            # Public URL
            # -------------------------------------------------

            if supabase:
                image_url = supabase.storage.from_(
                    BUCKET_NAME
                ).get_public_url(storage_path)
            else:
                image_url = request.build_absolute_uri(
                    uploaded_image.image.url
                )

            return Response(
                {
                    "id":
                    uploaded_image.id,

                    "user":
                    request.user.id,

                    "image":
                    image_url,

                    "image_url":
                    image_url,

                    "image_type":
                    uploaded_image.image_type,

                    "created_at":
                    uploaded_image.created_at,
                },
                status=201
            )

        except Exception as e:

            return Response(
                {
                    "error":
                    "Failed to upload image.",

                    "details":
                    str(e)
                },
                status=500
            )

        finally:

            if os.path.exists(temp_path):

                os.remove(temp_path)


# =========================================================
# DEMO PROMPTS
# =========================================================

class DemoPromptViewSet(viewsets.ModelViewSet):

    serializer_class = DemoPromptSerializer
    permission_classes = [IsAuthenticated]

    queryset = DemoPrompt.objects.all()

    http_method_names = [
        "get",
        "post",
        "head",
        "options"
    ]


# =========================================================
# FEATURE EXPLANATIONS
# =========================================================

class FeatureExplanationViewSet(viewsets.ModelViewSet):

    serializer_class = FeatureExplanationSerializer
    permission_classes = [IsAuthenticated]

    queryset = FeatureExplanation.objects.all()

    http_method_names = [
        "get",
        "post",
        "head",
        "options"
    ]


# =========================================================
# REGENERATIONS
# =========================================================

class RegenerationViewSet(viewsets.ModelViewSet):

    serializer_class = RegenerationSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = [
        "get",
        "post",
        "head",
        "options"
    ]

    def get_queryset(self):

        return Regeneration.objects.filter(
            project__user=self.request.user
        ).order_by(
            "project_id",
            "generation_number"
        )

    def perform_create(self, serializer):

        project = serializer.validated_data.get(
            "project"
        )

        if project.user != self.request.user:

            raise ValidationError({
                "project":
                "You do not own this project."
            })

        last_generation = (
            Regeneration.objects
            .filter(project=project)
            .order_by("-generation_number")
            .first()
        )

        if last_generation:

            next_generation = (
                last_generation.generation_number + 1
            )

        else:

            next_generation = 1

        serializer.save(
            generation_number=next_generation
        )


# =========================================================
# HISTORY API
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def history_api(request):

    projects = Project.objects.filter(
        user=request.user
    ).order_by(
        "-created_at"
    )

    history = []

    for project in projects:

        history.append({

            "project_id":
                project.id,

            "project_name":
                project.name,

            "original_image_url":
                project.original_image_url,

            "edited_image_url":
                project.edited_image_url,

            "editing_profile":
                (
                    project.editing_profile.name
                    if project.editing_profile
                    else None
                ),

            "created_at":
                project.created_at,

            "regenerations": [
                {
                    "id": regeneration.id,

                    "generation_number":
                        regeneration.generation_number,

                    "image_url":
                        regeneration.image_url,

                    "created_at":
                        regeneration.created_at,
                }

                for regeneration
                in project.regenerations.all()
            ],
        })

    return Response({

        "count":
            len(history),

        "history":
            history,

        "projects":
            history,
    })


# =========================================================
# STYLE MIRROR HOME
# =========================================================

from django.shortcuts import render


def style_mirror_home(request):

    return render(
        request,
        "style_mirror/index.html"
    )