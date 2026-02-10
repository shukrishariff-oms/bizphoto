from PIL import Image, ImageDraw, ImageFont
import os

def apply_watermark(input_image_path, output_image_path, watermark_text="ANTIGRAVITY"):
    """
    Applies a diagonal text watermark to an image.
    """
    try:
        base = Image.open(input_image_path).convert("RGBA")
        txt = Image.new("RGBA", base.size, (255, 255, 255, 0))

        # Choose a font size relative to image height
        font_size = int(base.height / 15)
        try:
            # Try to load a system font, fallback to default
            font = ImageFont.truetype("arial.ttf", font_size)
        except IOError:
            font = ImageFont.load_default()

        d = ImageDraw.Draw(txt)
        
        # Calculate position for center
        text_bbox = d.textbbox((0, 0), watermark_text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        x = (base.width - text_width) // 2
        y = (base.height - text_height) // 2

        # Draw semi-transparent text
        d.text((x, y), watermark_text, fill=(255, 255, 255, 128), font=font)

        out = Image.alpha_composite(base, txt)
        out = out.convert("RGB") # Remove alpha for JPEG compatibility if needed
        out.save(output_image_path, "JPEG", quality=85)
        return True
    except Exception as e:
        print(f"Error applying watermark: {e}")
        return False
