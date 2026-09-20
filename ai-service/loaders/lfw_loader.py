import os
import csv
import logging
from typing import List, Tuple, Optional
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("LFWLoader")

def load_lfw_pairs(
    lfw_dir: str,
    pairs_file: str,
    verify_images: bool = True
) -> List[Tuple[str, str, bool]]:
    """
    Parses LFW pairs file (CSV or TXT format) into (image1_path, image2_path, is_same) tuples
    per the standard LFW verification protocol.

    Args:
        lfw_dir: Base directory containing person subfolders (e.g. lfw-deepfunneled/lfw-deepfunneled)
        pairs_file: Path to pairs.csv, pairs.txt, matchpairsDevTrain.csv, etc.
        verify_images: If True, attempts to open each image to verify file existence and integrity.

    Returns:
        List of (image1_path, image2_path, is_same) tuples.
    """
    if not os.path.exists(pairs_file):
        logger.error(f"Pairs file not found: {pairs_file}")
        return []
    if not os.path.exists(lfw_dir):
        logger.error(f"LFW images directory not found: {lfw_dir}")
        return []

    pairs = []
    skipped_count = 0
    total_parsed = 0

    def resolve_img_path(name: str, num: int) -> str:
        # Standard LFW naming convention: Name/Name_0001.jpg
        filename = f"{name}_{int(num):04d}.jpg"
        return os.path.join(lfw_dir, name, filename)

    def is_valid_image(path: str) -> bool:
        if not os.path.exists(path):
            return False
        if not verify_images:
            return True
        try:
            with Image.open(path) as img:
                img.verify()
            return True
        except Exception as e:
            logger.warning(f"Corrupted or unreadable image skipped: {path} ({e})")
            return False

    with open(pairs_file, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        for row_idx, row in enumerate(reader):
            if not row:
                continue
            # Clean up cells
            row = [c.strip() for c in row if c.strip()]
            if not row:
                continue

            # Header skip
            if row_idx == 0 and ("name" in row[0].lower() or "imagenum" in row[0].lower()):
                continue

            # Check standard TXT format first line (which could be single number like "10 300")
            if len(row) == 2 and row[0].isdigit() and row[1].isdigit():
                continue

            try:
                if len(row) == 3:
                    # Same person: name, img1, img2
                    name, idx1, idx2 = row[0], int(row[1]), int(row[2])
                    img1_path = resolve_img_path(name, idx1)
                    img2_path = resolve_img_path(name, idx2)
                    is_same = True
                elif len(row) == 4:
                    # Different person: name1, img1, name2, img2
                    name1, idx1, name2, idx2 = row[0], int(row[1]), row[2], int(row[3])
                    img1_path = resolve_img_path(name1, idx1)
                    img2_path = resolve_img_path(name2, idx2)
                    is_same = False
                else:
                    logger.debug(f"Skipping unrecognized row {row_idx}: {row}")
                    skipped_count += 1
                    continue

                total_parsed += 1

                if verify_images:
                    if not (is_valid_image(img1_path) and is_valid_image(img2_path)):
                        skipped_count += 1
                        continue

                pairs.append((img1_path, img2_path, is_same))

            except Exception as e:
                logger.warning(f"Error parsing row {row_idx} {row}: {e}")
                skipped_count += 1

    same_count = sum(1 for p in pairs if p[2])
    diff_count = sum(1 for p in pairs if not p[2])
    logger.info(f"LFW Loader Summary: {len(pairs)} valid pairs loaded ({same_count} same, {diff_count} diff). Skipped/Missing: {skipped_count}.")
    return pairs
