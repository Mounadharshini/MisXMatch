package com.misxmatch.casesvc.util;

import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public class FileValidationUtil {

    public static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    public static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp", ".pdf");
    public static final List<String> ALLOWED_MIME_TYPES = List.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
    );

    public static void validateFileUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File upload request is empty or missing.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size (" + (file.getSize() / (1024 * 1024)) + "MB) exceeds maximum limit of 10MB.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("Invalid filename.");
        }

        String lowerFilename = originalFilename.toLowerCase();
        boolean validExtension = ALLOWED_EXTENSIONS.stream().anyMatch(lowerFilename::endsWith);
        if (!validExtension) {
            throw new IllegalArgumentException("Unsupported file extension. Allowed extensions: .jpg, .jpeg, .png, .webp, .pdf");
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            String lowerType = contentType.toLowerCase();
            boolean validMime = ALLOWED_MIME_TYPES.stream().anyMatch(lowerType::contains);
            if (!validMime) {
                throw new IllegalArgumentException("Unsupported Content-Type '" + contentType + "'. Allowed: JPEG, PNG, WEBP, PDF.");
            }
        }

        // Binary Magic Bytes Validation
        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(12);
            if (header.length < 4) {
                throw new IllegalArgumentException("File header is malformed or corrupted.");
            }

            boolean isJpg = (header[0] == (byte) 0xFF && header[1] == (byte) 0xD8);
            boolean isPng = (header[0] == (byte) 0x89 && header[1] == (byte) 0x50 && header[2] == (byte) 0x4E && header[3] == (byte) 0x47);
            boolean isPdf = (header[0] == (byte) 0x25 && header[1] == (byte) 0x50 && header[2] == (byte) 0x44 && header[3] == (byte) 0x46); // %PDF
            boolean isWebp = (header.length >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P');

            if (!isJpg && !isPng && !isPdf && !isWebp) {
                throw new IllegalArgumentException("Invalid binary file header. Executable or unknown file formats are strictly rejected.");
            }

            // Image integrity check for images
            if (!isPdf) {
                try {
                    BufferedImage img = ImageIO.read(new ByteArrayInputStream(file.getBytes()));
                    if (img == null || img.getWidth() <= 0 || img.getHeight() <= 0) {
                        throw new IllegalArgumentException("Corrupted image file: unable to decode dimensions.");
                    }
                } catch (Exception e) {
                    throw new IllegalArgumentException("Corrupted image payload: " + e.getMessage());
                }
            }

        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to inspect file stream: " + e.getMessage());
        }
    }
}
