package com.misxmatch.casesvc.service;

import io.minio.*;
import io.minio.errors.MinioException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MinioFileStorageServiceImpl implements FileStorageService {

    @Value("${minio.endpoint:http://localhost:9000}")
    private String minioEndpoint;

    @Value("${minio.access-key:minioadmin}")
    private String accessKey;

    @Value("${minio.secret-key:minioadmin}")
    private String secretKey;

    @Value("${minio.bucket:misxmatch-uploads}")
    private String bucketName;

    @Value("${minio.public-url:}")
    private String publicUrlPrefix;

    private MinioClient minioClient;
    private boolean minioAvailable = false;
    private Path localStorageDir;

    @PostConstruct
    public void init() {
        // Prepare local fallback directory for unit tests / offline execution
        try {
            localStorageDir = Paths.get(System.getProperty("user.dir"), "uploads_storage").toAbsolutePath();
            Files.createDirectories(localStorageDir);
        } catch (IOException e) {
            log.warn("Could not create local storage fallback directory: {}", e.getMessage());
            localStorageDir = Paths.get(System.getProperty("java.io.tmpdir"), "misxmatch_uploads");
            try { Files.createDirectories(localStorageDir); } catch (Exception ignored) {}
        }

        // Initialize MinIO client
        try {
            log.info("Connecting to S3/MinIO storage at endpoint: {}", minioEndpoint);
            minioClient = MinioClient.builder()
                    .endpoint(minioEndpoint)
                    .credentials(accessKey, secretKey)
                    .build();

            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                log.info("Creating S3/MinIO bucket: {}", bucketName);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
            minioAvailable = true;
            log.info("S3/MinIO storage service initialized successfully. Bucket: {}", bucketName);
        } catch (Exception e) {
            log.warn("MinIO service not reachable ({}); falling back to local file storage at {}", e.getMessage(), localStorageDir);
            minioAvailable = false;
        }
    }

    @Override
    public String storeFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }
        try {
            return storeFile(
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getInputStream(),
                    file.getSize(),
                    folder
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file stream", e);
        }
    }

    @Override
    public String storeFile(String originalFilename, String contentType, InputStream inputStream, long size, String folder) {
        String cleanName = (originalFilename != null && !originalFilename.isBlank())
                ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "file.bin";
        String folderPrefix = (folder != null && !folder.isBlank()) ? folder.replaceAll("[^a-zA-Z0-9_-]", "") + "/" : "";
        String objectKey = folderPrefix + UUID.randomUUID().toString() + "-" + cleanName;

        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }

        if (minioAvailable && minioClient != null) {
            try {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectKey)
                                .stream(inputStream, size, -1)
                                .contentType(contentType)
                                .build()
                );
                log.info("File uploaded to S3/MinIO bucket {}: key={}", bucketName, objectKey);
                return buildAccessUrl(objectKey);
            } catch (Exception e) {
                log.error("MinIO putObject failed ({}); storing to local fallback: {}", e.getMessage(), objectKey);
            }
        }

        // Local Storage Fallback
        try {
            byte[] bytes = inputStream.readAllBytes();
            Path targetPath = localStorageDir.resolve(objectKey.replace('/', '_'));
            Files.write(targetPath, bytes);
            log.info("File stored in local fallback storage: key={}, path={}", objectKey, targetPath);

            // Mirror to any sibling or parent uploads_storage directory
            for (Path dir : getCandidateStorageDirs()) {
                if (!dir.equals(localStorageDir)) {
                    try {
                        Files.write(dir.resolve(objectKey.replace('/', '_')), bytes);
                    } catch (Exception ignored) {}
                }
            }

            return buildAccessUrl(objectKey);
        } catch (IOException e) {
            throw new RuntimeException("Failed to save file to local fallback storage", e);
        }
    }

    private List<Path> getCandidateStorageDirs() {
        List<Path> list = new java.util.ArrayList<>();
        if (localStorageDir != null) {
            list.add(localStorageDir);
            if (localStorageDir.getParent() != null) {
                list.add(localStorageDir.getParent().resolve("uploads_storage"));
                list.add(localStorageDir.getParent().resolve("case-service").resolve("uploads_storage"));
            }
            list.add(localStorageDir.resolve("case-service").resolve("uploads_storage"));
        }
        try {
            Path cur = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
            while (cur != null) {
                list.add(cur.resolve("uploads_storage"));
                list.add(cur.resolve("case-service").resolve("uploads_storage"));
                cur = cur.getParent();
            }
        } catch (Exception ignored) {}
        list.add(Paths.get(System.getProperty("java.io.tmpdir"), "misxmatch_uploads"));

        return list.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .filter(Files::exists)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public InputStream getFileStream(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("Object key is required");
        }
        String cleanKey = sanitizeObjectKey(objectKey);

        if (minioAvailable && minioClient != null) {
            try {
                return minioClient.getObject(
                        GetObjectArgs.builder()
                                .bucket(bucketName)
                                .object(cleanKey)
                                .build()
                );
            } catch (Exception e) {
                log.warn("MinIO getObject failed for key={}: {}", cleanKey, e.getMessage());
            }
        }

        // Local Storage Fallback: search across all project uploads_storage candidate directories
        String flattenedKey = cleanKey.replace('/', '_');
        for (Path dir : getCandidateStorageDirs()) {
            Path p1 = dir.resolve(flattenedKey);
            if (Files.exists(p1) && !Files.isDirectory(p1)) {
                try {
                    return Files.newInputStream(p1);
                } catch (IOException e) {
                    log.warn("Failed reading from {}: {}", p1, e.getMessage());
                }
            }
            Path p2 = dir.resolve(cleanKey);
            if (Files.exists(p2) && !Files.isDirectory(p2)) {
                try {
                    return Files.newInputStream(p2);
                } catch (IOException e) {
                    log.warn("Failed reading from {}: {}", p2, e.getMessage());
                }
            }
        }
        throw new RuntimeException("File not found in storage: " + objectKey);
    }

    @Override
    public Resource loadAsResource(String objectKey) {
        try {
            InputStream is = getFileStream(objectKey);
            byte[] bytes = is.readAllBytes();
            is.close();
            return new ByteArrayResource(bytes);
        } catch (Exception e) {
            log.error("Error loading resource for key={}: {}", objectKey, e.getMessage());
            throw new RuntimeException("Resource not found: " + objectKey, e);
        }
    }

    @Override
    public void deleteFile(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return;
        String cleanKey = sanitizeObjectKey(objectKey);

        if (minioAvailable && minioClient != null) {
            try {
                minioClient.removeObject(
                        RemoveObjectArgs.builder()
                                .bucket(bucketName)
                                .object(cleanKey)
                                .build()
                );
                log.info("Deleted object from MinIO: key={}", cleanKey);
            } catch (Exception e) {
                log.warn("MinIO removeObject failed for key={}: {}", cleanKey, e.getMessage());
            }
        }

        String flattenedKey = cleanKey.replace('/', '_');
        for (Path dir : getCandidateStorageDirs()) {
            try {
                Files.deleteIfExists(dir.resolve(flattenedKey));
                Files.deleteIfExists(dir.resolve(cleanKey));
            } catch (IOException ignored) {}
        }
    }

    private String buildAccessUrl(String objectKey) {
        if (publicUrlPrefix != null && !publicUrlPrefix.isBlank()) {
            return publicUrlPrefix + (publicUrlPrefix.endsWith("/") ? "" : "/") + objectKey;
        }
        // Relative API gateway route
        return "/api/cases/files/" + objectKey;
    }

    private String sanitizeObjectKey(String raw) {
        if (raw == null) return "";
        try {
            raw = java.net.URLDecoder.decode(raw, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception ignored) {}
        int idx = raw.indexOf("/files/");
        if (idx >= 0) {
            return raw.substring(idx + 7);
        }
        if (raw.startsWith("/api/cases/files/")) {
            return raw.substring("/api/cases/files/".length());
        }
        if (raw.startsWith("/cases/files/")) {
            return raw.substring("/cases/files/".length());
        }
        return raw;
    }
}
