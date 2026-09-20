package com.misxmatch.casesvc.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;

public class FileStorageServiceTest {

    private MinioFileStorageServiceImpl fileStorageService;

    @BeforeEach
    void setUp() {
        fileStorageService = new MinioFileStorageServiceImpl();
        fileStorageService.init(); // Initialize with fallback storage if MinIO container is not running
    }

    @Test
    @DisplayName("storeFile & getFileStream - Should store file and stream it back")
    void testStoreAndGetFileStream() throws Exception {
        byte[] content = "Hello MISXMATCH S3 File Storage Test".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-photo.jpg",
                "image/jpeg",
                content
        );

        String accessUrl = fileStorageService.storeFile(file, "photos");
        assertNotNull(accessUrl, "Access URL should not be null");
        assertTrue(accessUrl.contains("test-photo.jpg"), "Access URL should contain clean filename");

        // Retrieve file stream
        InputStream is = fileStorageService.getFileStream(accessUrl);
        assertNotNull(is, "File input stream should be openable");
        byte[] retrievedBytes = is.readAllBytes();
        is.close();

        assertArrayEquals(content, retrievedBytes, "Retrieved file bytes should match uploaded content");
    }

    @Test
    @DisplayName("loadAsResource - Should load stored file as Spring Resource")
    void testLoadAsResource() throws Exception {
        byte[] content = "Resource byte content".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "document.pdf",
                "application/pdf",
                content
        );

        String accessUrl = fileStorageService.storeFile(file, "evidence");
        Resource resource = fileStorageService.loadAsResource(accessUrl);
        assertNotNull(resource, "Loaded resource should not be null");
        assertEquals(content.length, resource.contentLength(), "Content length should match");
    }

    @Test
    @DisplayName("deleteFile - Should safely delete file from storage")
    void testDeleteFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "to-delete.txt", "text/plain", "data".getBytes());
        String accessUrl = fileStorageService.storeFile(file, "temp");

        assertDoesNotThrow(() -> fileStorageService.deleteFile(accessUrl));
    }
}
