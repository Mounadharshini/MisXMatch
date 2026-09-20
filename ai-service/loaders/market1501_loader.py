import os
import re
import logging
from typing import List, Tuple, Optional
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Market1501Loader")

# Pattern: personID_cameraID... (e.g. 0001_c1s1_001051_00.jpg, -1_c1s1_000401_03.jpg)
MARKET_PATTERN = re.compile(r"^([-\d]+)_c(\d+)s(\d+)_(\d+)_(\d+)\.jpg", re.IGNORECASE)

def load_market1501_split(
    folder_path: str,
    verify_images: bool = True
) -> List[Tuple[str, str, int]]:
    """
    Parses Market-1501 image folder (bounding_box_train, bounding_box_test, query)
    into (image_path, person_id, camera_id) tuples.

    Args:
        folder_path: Path to bounding_box_test / bounding_box_train / query
        verify_images: If True, verifies image files can be read/opened.

    Returns:
        List of (image_path, person_id, camera_id) tuples.
    """
    if not os.path.exists(folder_path):
        logger.error(f"Market-1501 folder not found: {folder_path}")
        return []

    records = []
    skipped_count = 0
    unique_pids = set()
    unique_cams = set()

    for fname in os.listdir(folder_path):
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue

        fpath = os.path.join(folder_path, fname)
        match = MARKET_PATTERN.match(fname)

        if not match:
            # Try looser fallback: personID_cameraID
            parts = fname.split("_")
            if len(parts) >= 2:
                pid = parts[0]
                cam_str = parts[1]
                cam_match = re.search(r"c(\d+)", cam_str, re.IGNORECASE)
                cam_id = int(cam_match.group(1)) if cam_match else -1
            else:
                logger.warning(f"Unparseable Market-1501 filename skipped: {fname}")
                skipped_count += 1
                continue
        else:
            pid = match.group(1)
            cam_id = int(match.group(2))

        if verify_images:
            try:
                with Image.open(fpath) as img:
                    img.verify()
            except Exception as e:
                logger.warning(f"Corrupted Market-1501 image skipped: {fpath} ({e})")
                skipped_count += 1
                continue

        records.append((fpath, pid, cam_id))
        unique_pids.add(pid)
        unique_cams.add(cam_id)

    logger.info(
        f"Market-1501 Loader Summary [{os.path.basename(folder_path)}]: "
        f"{len(records)} images loaded across {len(unique_pids)} person IDs and {len(unique_cams)} camera IDs. "
        f"Skipped: {skipped_count}."
    )
    return records
