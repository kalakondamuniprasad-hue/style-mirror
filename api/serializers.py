from rest_framework import serializers

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

from .supabase_storage import supabase, BUCKET_NAME


# =========================================================
# USER PROFILE
# =========================================================

class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserProfile
        fields = "__all__"

        read_only_fields = [
            "id",
            "supabase_user_id",
            "email",
            "created_at",
        ]


# =========================================================
# REFERENCE IMAGE
# =========================================================

class ReferenceImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReferenceImage
        fields = "__all__"

        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]


# =========================================================
# EDITING PROFILE
# =========================================================

class EditingProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = EditingProfile
        fields = "__all__"

        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
        ]


# =========================================================
# PROJECT
# =========================================================

class ProjectSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        fields = "__all__"

        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]


# =========================================================
# EXPORT
# =========================================================

class ExportSerializer(serializers.ModelSerializer):

    class Meta:
        model = Export
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
        ]


# =========================================================
# UPLOADED IMAGE
# =========================================================

class UploadedImageSerializer(serializers.ModelSerializer):

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = UploadedImage

        fields = [
            "id",
            "user",
            "image",
            "image_url",
            "image_type",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "image_url",
            "created_at",
        ]

    def get_image_url(self, obj):

        if not obj.image:
            return None

        if hasattr(obj.image, "url") and obj.image.url:
            return obj.image.url

        image_path = obj.image.name

        if not image_path:
            return None

        if supabase is not None:
            return (
                supabase
                .storage
                .from_(BUCKET_NAME)
                .get_public_url(image_path)
            )

        return f"http://127.0.0.1:8000/media/{image_path.lstrip('/')}"


# =========================================================
# DEMO PROMPT
# =========================================================

class DemoPromptSerializer(serializers.ModelSerializer):

    class Meta:
        model = DemoPrompt
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
        ]


# =========================================================
# FEATURE EXPLANATION
# =========================================================

class FeatureExplanationSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeatureExplanation
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
        ]


# =========================================================
# REGENERATION
# =========================================================

class RegenerationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Regeneration
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "generation_number",
        ]