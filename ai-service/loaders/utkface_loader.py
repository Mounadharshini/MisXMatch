import os
import re
import logging
from typing import List, Tuple, Optional
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("UTKFaceLoader")

# Standard UTKFace filename format: [age]_[gender]_[race]_[date].jpg(.chip.jpg)
UTK_PATTERN = re.compile(r"^(\d+)_([01])_([0-4])_(\d+).*", re.IGNORECASE)

GENDER_MAP = {0: "Male", 1: "Female"}
RACE_MAP = {0: "White", 1: "Black", 2: "Asian", 3: "Indian", 4: "Others"}

def load_utkface(
    folder_path: str,
    verify_images: bool = True
) -> List[Tuple[str, int, int, int]]:
    """
    Parses UTKFace dataset directory into (image_path, age, gender, race) tuples.

    Args:
        folder_path: Path to directory containing UTKFace images.
        verify_images: If True, opens image files to ensure integrity.

    Returns:
        List of (image_path, age, gender, race) tuples.
    """
    if not os.path.exists(folder_path):
        logger.error(f"UTKFace directory not found: {folder_path}")
        return []

    records = []
    skipped_count = 0

    for fname in os.listdir(folder_path):
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue

        fpath = os.path.join(folder_path, fname)
        match = UTK_PATTERN.match(fname)

        if not match:
            # Check edge cases with malformed or missing fields
            parts = fname.split("_")
            if len(parts) >= 3 and parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit():
                try:
                    age = int(parts[0])
                    gender = int(parts[1])
                    race = int(parts[2])
                except ValueError:
                    logger.warning(f"Malformed UTKFace filename skipped: {fname}")
                    skipped_count += 1
                    continue
            else:
                logger.warning(f"Unrecognized UTKFace filename format skipped: {fname}")
                skipped_count += 1
                continue
        else:
            age = int(match.group(1))
            gender = int(match.group(2))
            race = int(match.group(3))

        if verify_images:
            try:
                with Image.open(fpath) as img:
                    img.verify()
            except Exception as e:
                logger.warning(f"Corrupted UTKFace image skipped: {fpath} ({e})")
                skipped_count += 1
                continue

        records.append((fpath, age, gender, race))

    logger.info(
        f"UTKFace Loader Summary: {len(records)} images loaded successfully. "
        f"Skipped/Malformed: {skipped_count}."
    )
    return records
