import os

import jwt
from jwt import PyJWKClient

from dotenv import load_dotenv
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import UserProfile


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ISSUER = f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else None
SUPABASE_JWKS_URL = (
    f"{SUPABASE_ISSUER}/.well-known/jwks.json"
    if SUPABASE_ISSUER
    else None
)

jwks_client = PyJWKClient(SUPABASE_JWKS_URL) if SUPABASE_JWKS_URL else None

LOCAL_DEMO_TOKEN = "stylemirror-demo-token"
LOCAL_DEMO_EMAIL = "demo@stylemirror.local"
LOCAL_DEMO_USER_ID = "local-demo-user"


class LocalDemoAuthentication(BaseAuthentication):

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed(
                "Invalid Authorization header."
            )

        token = parts[1]

        if token not in {LOCAL_DEMO_TOKEN, "demo-local", "local-demo", "demo"}:
            return None

        user_profile, created = UserProfile.objects.get_or_create(
            supabase_user_id=LOCAL_DEMO_USER_ID,
            defaults={
                "email": LOCAL_DEMO_EMAIL,
                "name": "Demo User",
            },
        )

        if not created and user_profile.email != LOCAL_DEMO_EMAIL:
            user_profile.email = LOCAL_DEMO_EMAIL
            user_profile.save(update_fields=["email"])

        return (user_profile, None)


class SupabaseAuthentication(BaseAuthentication):

    def authenticate(self, request):

        if not SUPABASE_URL or not jwks_client:
            return None

        auth_header = request.headers.get("Authorization")

        print("AUTH HEADER PRESENT:", bool(auth_header))

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed(
                "Invalid Authorization header."
            )

        token = parts[1]

        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
                issuer=SUPABASE_ISSUER,
            )

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed(
                "Supabase access token has expired."
            )

        except jwt.InvalidTokenError:
            raise AuthenticationFailed(
                "Invalid Supabase access token."
            )

        supabase_user_id = payload.get("sub")
        email = payload.get("email", "")

        if not supabase_user_id:
            raise AuthenticationFailed(
                "Supabase user ID is missing from token."
            )

        user_profile, created = UserProfile.objects.get_or_create(
            supabase_user_id=supabase_user_id,
            defaults={
                "email": email,
            },
        )

        if not created and email and user_profile.email != email:
            user_profile.email = email
            user_profile.save(update_fields=["email"])

        return (user_profile, None)