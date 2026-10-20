import requests

if __name__ == "__main__":

    BASE_URL = "http://127.0.0.1:8000"

    token = input("Paste your Supabase access token: ").strip()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    data = {
        "project": 4,
        "file_url": "http://127.0.0.1:8000/media/regenerated_project_4_generation_1.jpg",
        "file_type": "jpg"
    }

    response = requests.post(
        f"{BASE_URL}/api/exports/",
        headers=headers,
        json=data
    )

    print("\nEXPORT STATUS:", response.status_code)
    print("EXPORT RESPONSE:")
    print(response.text)
