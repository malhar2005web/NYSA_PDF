from PIL import Image

input_path = r"d:\Desktop\bhusari sir bmr-bpr\OIP.jpg"
output_path = r"d:\Desktop\bhusari sir bmr-bpr\frontend\public\completed_stamp.png"

img = Image.open(input_path).convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    r, g, b, a = item
    if g > r + 15 and g > b + 15 and g > 50:
        newData.append((r, g, b, 255))
    elif g > 80 and (g - r) > 8 and (g - b) > 8:
        newData.append((r, g, b, 220))
    else:
        newData.append((255, 255, 255, 0))

img.putdata(newData)

bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

img.save(output_path, "PNG")
print(f"Clean cropped stamp saved to: {output_path}")
