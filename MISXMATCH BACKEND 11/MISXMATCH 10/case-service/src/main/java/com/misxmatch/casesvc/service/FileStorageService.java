package com.misxmatch.casesvc.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

public interface FileStorageService {
    
    /**
     * Uploads a multipart file to object storage under the specified folder.
     * Returns the accessible URL/key to retrieve the stored file.
     */
    String storeFile(MultipartFile file, String folder);

    /**
     * Uploads an input stream to object storage.
     */
    String storeFile(String originalFilename, String contentType, InputStream inputStream, long size, String folder);

    /**
     * Retrieves an input stream for a stored file by its object key/filename.
     */
    InputStream getFileStream(String objectKey);

    /**
     * Retrieves a Resource for streaming/downloading a stored file.
     */
    Resource loadAsResource(String objectKey);

    /**
     * Deletes a file from object storage by its object key.
     */
    void deleteFile(String objectKey);
}
