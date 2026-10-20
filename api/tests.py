from io import BytesIO
import os
import tempfile
from unittest.mock import patch

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from api.authentication import LocalDemoAuthentication, SupabaseAuthentication
from api.models import UploadedImage, UserProfile
from api.style_api import style_match_api
from api.views import UploadedImageViewSet


class EditorRouteTests(TestCase):

    def test_home_route_offers_photo_and_video_workspaces(self):
        response = self.client.get("/", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'href="/photo-editor"')
        self.assertContains(response, 'href="/video-editor"')
        self.assertContains(response, 'href="/photo-restyle"')
        self.assertContains(response, 'href="/video-restyle"')

    def test_photo_editor_route_renders_photo_workspace(self):
        response = self.client.get("/photo-editor", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="photoWorkspacePreview"')
        self.assertContains(response, 'id="photoAiEditButton"')

    def test_video_editor_route_renders_video_workspace(self):
        response = self.client.get("/video-editor", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="videoPreview"')
        self.assertContains(response, 'id="videoClipTrack"')

    def test_photo_restyle_route_renders_restyle_controls(self):
        response = self.client.get("/photo-restyle", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="photoRestyleSource"')
        self.assertContains(response, 'id="photoRestyleButton"')
        self.assertContains(response, 'id="photoPreserveFace"')

    def test_video_restyle_route_renders_restyle_controls(self):
        response = self.client.get("/video-restyle", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="videoRestyleSource"')
        self.assertContains(response, 'id="videoRestyleButton"')
        self.assertContains(response, 'name="videoRestyleScope"')

    def test_profile_route_renders_profile_page(self):
        response = self.client.get("/profile", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="profilePage"')
        self.assertContains(response, 'id="profileForm"')


class UploadedImageLocalStorageTests(TestCase):

    def test_demo_upload_saves_to_local_media_without_supabase(self):
        image = Image.new("RGB", (20, 20), color=(125, 90, 180))
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)
        user = UserProfile.objects.create(
            supabase_user_id="local-upload-test",
            email="local-upload@example.com",
        )

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                request = APIRequestFactory().post(
                    "/api/uploaded-images/",
                    data={
                        "image": SimpleUploadedFile(
                            "photo.jpg",
                            buffer.getvalue(),
                            content_type="image/jpeg",
                        ),
                        "image_type": "original",
                    },
                    format="multipart",
                )
                force_authenticate(request, user=user)

                with patch("api.views.supabase", None):
                    response = UploadedImageViewSet.as_view({"post": "create"})(request)

                self.assertEqual(response.status_code, 201)
                uploaded_image = UploadedImage.objects.get(user=user)
                local_path = os.path.join(media_root, uploaded_image.image.name)
                self.assertTrue(os.path.isfile(local_path))
                self.assertTrue(response.data["image"].startswith("http://"))


class SupabaseAuthenticationTests(TestCase):

    def test_authenticate_returns_none_when_supabase_not_configured(self):
        request = type("Request", (), {"headers": {}})()

        self.assertIsNone(SupabaseAuthentication().authenticate(request))


class LocalDemoAuthenticationTests(TestCase):

    def test_authenticate_accepts_demo_token(self):
        request = type("Request", (), {"headers": {"Authorization": "Bearer stylemirror-demo-token"}})()

        user, _ = LocalDemoAuthentication().authenticate(request)

        self.assertIsNotNone(user)
        self.assertEqual(user.email, "demo@stylemirror.local")


class StyleMatchApiTests(TestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = UserProfile.objects.create(
            supabase_user_id="test-user-1",
            email="test@example.com",
        )

    def test_style_match_requires_reference_and_source_images(self):
        request = self.factory.post("/api/style-match/", data={})
        force_authenticate(request, user=self.user)

        response = style_match_api(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("reference_image", response.data["error"])

    def test_style_match_accepts_uploaded_images(self):
        image = Image.new("RGB", (80, 80), color=(255, 120, 80))
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)

        request = self.factory.post(
            "/api/style-match/",
            data={
                "intensity": 0.75,
                "reference_image": SimpleUploadedFile(
                    "reference.jpg",
                    buffer.getvalue(),
                    content_type="image/jpeg",
                ),
                "source_image": SimpleUploadedFile(
                    "source.jpg",
                    buffer.getvalue(),
                    content_type="image/jpeg",
                ),
            },
            format="multipart",
        )
        force_authenticate(request, user=self.user)

        response = style_match_api(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("edited_image_url", response.data)
        self.assertIn("style", response.data)
