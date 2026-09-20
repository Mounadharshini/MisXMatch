import os
import sys
from PIL import Image

# Add loaders to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from loaders.lfw_loader import load_lfw_pairs
from loaders.market1501_loader import load_market1501_split
from loaders.utkface_loader import load_utkface, GENDER_MAP, RACE_MAP

def run_sanity_checks():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("=" * 70)
    print("MISXMATCH AI-SERVICE: PHASE 0.5 DATASET LOADERS SANITY CHECK")
    print("=" * 70)

    # 1. LFW Dataset
    print("\n--- [1/3] LFW DATASET CHECK ---")
    lfw_img_dir = os.path.join(base_dir, "archive (2)", "lfw-deepfunneled", "lfw-deepfunneled")
    pairs_file = os.path.join(base_dir, "archive (2)", "pairs.csv")
    print(f"LFW Image Path: {lfw_img_dir}")
    print(f"LFW Pairs Path: {pairs_file}")

    lfw_pairs = load_lfw_pairs(lfw_img_dir, pairs_file, verify_images=True)
    print(f"Total verified LFW pairs from local subset: {len(lfw_pairs)}")
    
    print("\nSample LFW Parsed Pairs (first 5):")
    for i, (img1, img2, is_same) in enumerate(lfw_pairs[:5]):
        # Open and inspect
        with Image.open(img1) as im1, Image.open(img2) as im2:
            print(f"  [{i+1}] Same: {is_same}")
            print(f"      Img1: {os.path.basename(img1)} (size: {im1.size}, mode: {im1.mode})")
            print(f"      Img2: {os.path.basename(img2)} (size: {im2.size}, mode: {im2.mode})")

    # 2. Market-1501 Dataset
    print("\n--- [2/3] MARKET-1501 DATASET CHECK ---")
    market_dir = os.path.join(base_dir, "archive (1)", "Market-1501-v15.09.15", "bounding_box_test")
    print(f"Market-1501 Path: {market_dir}")

    market_records = load_market1501_split(market_dir, verify_images=True)
    print(f"Total Market-1501 records loaded: {len(market_records)}")

    print("\nSample Market-1501 Parsed Records (first 5):")
    for i, (img_path, pid, cam_id) in enumerate(market_records[:5]):
        with Image.open(img_path) as im:
            print(f"  [{i+1}] Person ID: {pid} | Camera ID: {cam_id} | Image: {os.path.basename(img_path)} (size: {im.size}, mode: {im.mode})")

    # 3. UTKFace Dataset
    print("\n--- [3/3] UTKFACE DATASET CHECK ---")
    utk_dir = os.path.join(base_dir, "archive", "UTKFace")
    print(f"UTKFace Path: {utk_dir}")

    utk_records = load_utkface(utk_dir, verify_images=True)
    print(f"Total UTKFace records loaded: {len(utk_records)}")

    print("\nSample UTKFace Parsed Records (first 5):")
    for i, (img_path, age, gender, race) in enumerate(utk_records[:5]):
        with Image.open(img_path) as im:
            g_str = GENDER_MAP.get(gender, str(gender))
            r_str = RACE_MAP.get(race, str(race))
            print(f"  [{i+1}] Age: {age} | Gender: {g_str} ({gender}) | Race: {r_str} ({race}) | File: {os.path.basename(img_path)} (size: {im.size}, mode: {im.mode})")

    print("\n" + "=" * 70)
    print("ALL THREE DATASET LOADERS PASSED SANITY CHECKS SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_sanity_checks()
