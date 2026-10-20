from django.urls import path, include

from rest_framework.routers import DefaultRouter

from .views import (
    UserProfileViewSet,
    ReferenceImageViewSet,
    EditingProfileViewSet,
    ProjectViewSet,
    ExportViewSet,
    UploadedImageViewSet,
    DemoPromptViewSet,
    FeatureExplanationViewSet,
    RegenerationViewSet,
    history_api,
)

from .style_api import (
    create_style_profile_api,
    style_match_api,
)

from .apply_style_api import (
    apply_style_api,
    regenerate_api,
)


# =========================================================
# ROUTER
# =========================================================

router = DefaultRouter()


router.register(
    "users",
    UserProfileViewSet,
    basename="users"
)

router.register(
    "reference-images",
    ReferenceImageViewSet,
    basename="reference-images"
)

router.register(
    "editing-profiles",
    EditingProfileViewSet,
    basename="editing-profiles"
)

router.register(
    "projects",
    ProjectViewSet,
    basename="projects"
)

router.register(
    "exports",
    ExportViewSet,
    basename="exports"
)

router.register(
    "uploaded-images",
    UploadedImageViewSet,
    basename="uploaded-images"
)

router.register(
    "demo-prompts",
    DemoPromptViewSet,
    basename="demo-prompts"
)

router.register(
    "feature-explanations",
    FeatureExplanationViewSet,
    basename="feature-explanations"
)

router.register(
    "regenerations",
    RegenerationViewSet,
    basename="regenerations"
)


# =========================================================
# URLS
# =========================================================

urlpatterns = [

    path(
        "",
        include(router.urls)
    ),

    path(
        "generate-style-profile/",
        create_style_profile_api
    ),

    path(
        "style-match/",
        style_match_api
    ),

    path(
        "apply-style/",
        apply_style_api
    ),

    path(
        "projects/<int:project_id>/regenerate/",
        regenerate_api
    ),

    path(
        "history/",
        history_api
    ),

]