import requests

if __name__ == "__main__":

    BASE_URL = "http://127.0.0.1:8000"

    token = input("Paste your Supabase access token: ").strip()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    PROJECT_ID = 4

    response = requests.post(
        f"{BASE_URL}/api/projects/{PROJECT_ID}/regenerate/",
        headers=headers
    )

    print("\nREGENERATION STATUS:", response.status_code)
    print("REGENERATION RESPONSE:")
    print(response.text)
