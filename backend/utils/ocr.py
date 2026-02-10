import easyocr
import os

# Initialize the reader once
reader = easyocr.Reader(['en'])

def detect_bib_numbers(image_path: str):
    """
    Detects bib numbers from the given image path.
    Returns a comma-separated string of detected numbers.
    """
    if not os.path.exists(image_path):
        return ""
    
    results = reader.readtext(image_path)
    
    # We want to filter for things that look like numbers (bibs are usually numeric or alphanumeric)
    detected_bibs = []
    for (bbox, text, prob) in results:
        # Simple heuristic: filter for numbers or short uppercase strings
        clean_text = "".join(c for c in text if c.isalnum()).upper()
        if clean_text.isdigit() or (len(clean_text) <= 5 and any(c.isdigit() for c in clean_text)):
            if prob > 0.4: # Confidence threshold
                detected_bibs.append(clean_text)
    
    return ",".join(list(set(detected_bibs)))
