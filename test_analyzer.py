from api.style_analyzer import analyze_image

if __name__ == "__main__":

    image_path = r"C:\Users\DELL\Downloads\cute krishna.jpg"

    style = analyze_image(image_path)

    print("\nSTYLE MIRROR AI IMAGE ANALYSIS")
    print("=" * 40)

    for key, value in style.items():
        print(f"\n{key}:")
        print(value)
