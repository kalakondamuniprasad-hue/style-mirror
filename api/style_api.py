import os
import tempfile

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import EditingProfile, Project, UploadedImage
from .style_analyzer import analyze_image
from .supabase_storage import upload_file
from style_editor import apply_style


def _scale_style_values(style_values, intensity):
    try:
        intensity_value = float(intensity)
    except (TypeError, ValueError):
        intensity_value = 1.0

    intensity_value = max(0.0, min(2.5, intensity_value))

    adjusted = {}

    for key, value in style_values.items():
        if isinstance(value, (int, float)):
            adjusted[key] = round(float(value) * intensity_value, 2)
        else:
            adjusted[key] = value

    return adjusted


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_style_profile_api(request):

    # --------------------------------
    # Get uploaded image
    # --------------------------------

    image = request.FILES.get("image")

    if not image:
        return Response(
            {"error": "Please upload an image."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------
    # Save uploaded reference image
    # --------------------------------

    uploaded_image = UploadedImage.objects.create(
        user=request.user,
        image=image,
        image_type="reference"
    )

    # --------------------------------
    # Get actual file path
    # --------------------------------

    image_path = uploaded_image.image.path

    # --------------------------------
    # Analyze image using OpenCV
    # --------------------------------

    try:
        style_values = analyze_image(image_path)

    except Exception as e:

        uploaded_image.delete()

        return Response(
            {
                "error": "Image analysis failed.",
                "details": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # --------------------------------
    # Create Editing Profile
    # --------------------------------

    profile_name = request.data.get(
        "name",
        "AI Generated Style"
    )

    profile = EditingProfile.objects.create(
        user=request.user,
        name=profile_name,

        lightness=style_values["lightness"],
        contrast=style_values["contrast"],
        warmth=style_values["warmth"],
        tint=style_values["tint"],
        saturation=style_values["saturation"],

        curve=style_values["curve"],
        hsl=style_values["hsl"],

        fade=style_values["fade"],
        highlight=style_values["highlight"],
        shadow=style_values["shadow"],
        color=style_values["color"],
        hue=style_values["hue"],
        vignette=style_values["vignette"],
        sharpen=style_values["sharpen"],
        grain=style_values["grain"],
    )

    # --------------------------------
    # Return result
    # --------------------------------

    return Response(
        {
            "message": "Style profile generated successfully.",

            "profile_id": profile.id,

            "profile_name": profile.name,

            "reference_image_id": uploaded_image.id,

            "style": style_values,
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def style_match_api(request):
    reference_image = request.FILES.get("reference_image")
    source_image = request.FILES.get("source_image")
    intensity = request.data.get("intensity", 1.0)
    profile_name = request.data.get("name", "AI Generated Style")
    project_id = request.data.get("project_id")

    if not reference_image:
        return Response(
            {"error": "reference_image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not source_image and not project_id:
        return Response(
            {"error": "source_image is required when project_id is not supplied."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reference_upload = UploadedImage.objects.create(
        user=request.user,
        image=reference_image,
        image_type="reference",
    )

    reference_path = reference_upload.image.path

    try:
        style_values = analyze_image(reference_path)
    except Exception as exc:
        reference_upload.delete()
        return Response(
            {"error": "Image analysis failed.", "details": str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    adjusted_style = _scale_style_values(style_values, intensity)

    profile = EditingProfile.objects.create(
        user=request.user,
        name=profile_name,
        lightness=adjusted_style.get("lightness", 0),
        contrast=adjusted_style.get("contrast", 0),
        warmth=adjusted_style.get("warmth", 0),
        tint=adjusted_style.get("tint", 0),
        saturation=adjusted_style.get("saturation", 0),
        curve=adjusted_style.get("curve", {}),
        hsl=adjusted_style.get("hsl", {}),
        fade=adjusted_style.get("fade", 0),
        highlight=adjusted_style.get("highlight", 0),
        shadow=adjusted_style.get("shadow", 0),
        color=adjusted_style.get("color", 0),
        hue=adjusted_style.get("hue", 0),
        vignette=adjusted_style.get("vignette", 0),
        sharpen=adjusted_style.get("sharpen", 0),
        grain=adjusted_style.get("grain", 0),
    )

    if project_id:
        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if source_image:
            source_upload = UploadedImage.objects.create(
                user=request.user,
                image=source_image,
                image_type="original",
            )
            project.original_image_url = request.build_absolute_uri(source_upload.image.url)
        else:
            source_upload = None
    else:
        source_upload = UploadedImage.objects.create(
            user=request.user,
            image=source_image,
            image_type="original",
        )
        project = Project.objects.create(
            user=request.user,
            name=profile_name,
            original_image_url=request.build_absolute_uri(source_upload.image.url),
            editing_profile=profile,
        )

    project.editing_profile = profile
    project.save(update_fields=["original_image_url", "editing_profile"])

    source_path = source_upload.image.path if source_upload else project.original_image_url
    temp_source = None
    temp_output = None

    try:
        if source_path.startswith("/") and not os.path.exists(source_path):
            source_path = request.build_absolute_uri(source_path)

        if source_path.startswith("http://") or source_path.startswith("https://"):
            from .apply_style_api import download_image_from_url

            temp_source = download_image_from_url(source_path)
            source_path = temp_source

        edited_image = apply_style(source_path, adjusted_style)
        temp_output = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False).name
        import cv2
        cv2.imwrite(temp_output, edited_image)
        edited_image_url = upload_file(temp_output, folder="edited")
    except Exception as exc:
        return Response(
            {"error": "Style match failed.", "details": str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    finally:
        for temp_file in [temp_source, temp_output]:
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)

    project.edited_image_url = edited_image_url
    project.save(update_fields=["edited_image_url"])

    return Response(
        {
            "message": "Style match completed successfully.",
            "profile_id": profile.id,
            "project_id": project.id,
            "style": style_values,
            "adjusted_style": adjusted_style,
            "edited_image_url": edited_image_url,
        },
        status=status.HTTP_200_OK,
    )