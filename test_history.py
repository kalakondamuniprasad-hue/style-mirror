import requests

if __name__ == "__main__":

    BASE_URL = "http://127.0.0.1:8000"

    token = input("Paste your Supabase access token: ").strip()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/api/history/",
        headers=headers
    )

    print("\nHISTORY STATUS:", response.status_code)
    print("HISTORY RESPONSE:")
    print(response.text)
