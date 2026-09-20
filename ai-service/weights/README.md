# AI Model Weights

This directory contains pre-trained weights used by the MisXMatch AI microservice:

1. **`face_recognition_sface.onnx`** (~38 MB)
   - Primary OpenCV SFace 128-dimensional facial recognition feature extractor.
   - Fully included in this repository.

2. **`osnet_x1_0_market1501.pth`** (~10 MB)
   - Omni-Scale Network (OSNet) for Person Re-Identification (ReID) across video camera feeds.
   - Fully included in this repository.

3. **`arcface_resnet100_512.onnx`** (~261 MB, Optional)
   - Optional 512-dimensional ArcFace ResNet-100 model.
   - Excluded from Git version control due to GitHub's 100 MB per-file upload limit.
   - The AI service functions completely using SFace by default; if you require high-resolution ArcFace inference, download the weights from InsightFace / ONNX Model Zoo and place `arcface_resnet100_512.onnx` in this folder.
