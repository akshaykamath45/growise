from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUT = ROOT / "Growise_screenshot_contact_sheet.jpg"

CAPTURES = [
    ("01-user-login.png", "Learner login"),
    ("02-signup.png", "Sign-up & consent"),
    ("03-learner-landing.png", "Landing page"),
    ("04-course-catalog.png", "Course catalogue"),
    ("05-course-detail.png", "Course detail"),
    ("06-admin-login.png", "Admin login"),
    ("07-admin-agent-ops.png", "Agent Ops"),
    ("08-admin-events.png", "Event stream"),
    ("09-admin-trace-explorer.png", "Trace explorer"),
    ("10-admin-catalog-health.png", "Catalog health"),
    ("11-admin-course-management.png", "Course management"),
    ("12-for-you.png", "For you"),
    ("13-my-learning.png", "My learning"),
]


def font(size, bold=False):
    path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf"
    return ImageFont.truetype(path, size=size) if Path(path).exists() else ImageFont.load_default()


canvas = Image.new("RGB", (1600, 1510), "#FAFBFD")
draw = ImageDraw.Draw(canvas)
draw.text((58, 36), "Growise — captured product screens", font=font(34, True), fill="#332686")
draw.text((58, 82), "Learner journey and administrator console", font=font(19), fill="#5D6675")

tile_w, tile_h = 355, 315
for index, (filename, label) in enumerate(CAPTURES):
    col, row = index % 4, index // 4
    x, y = 58 + col * 385, 135 + row * 340
    with Image.open(ASSETS / filename) as source:
        image = source.convert("RGB")
        image.thumbnail((tile_w, 255))
        framed = Image.new("RGB", (tile_w, 255), "#FFFFFF")
        framed.paste(image, ((tile_w - image.width) // 2, (255 - image.height) // 2))
    draw.rounded_rectangle((x - 2, y - 2, x + tile_w + 2, y + 257), radius=10, fill="#FFFFFF", outline="#DDE2EA", width=2)
    canvas.paste(framed, (x, y))
    draw.text((x, y + 271), f"{index + 1:02d}  {label}", font=font(16, True), fill="#332686")

canvas.save(OUT, quality=92)
print(OUT)
