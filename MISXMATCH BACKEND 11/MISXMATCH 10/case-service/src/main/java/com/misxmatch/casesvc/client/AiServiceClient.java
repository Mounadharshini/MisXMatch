package com.misxmatch.casesvc.client;

import com.misxmatch.casesvc.dto.ai.*;
import com.misxmatch.casesvc.exception.AiServiceUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * AiServiceClient
 * ================
 * Dedicated Spring Boot REST Client for communicating with the independent Python FastAPI AI Microservice.
 * Handles timeouts, serialization/deserialization, error propagation, and security boundaries.
 * 
 * NO fake fallback AI scores or random values are returned when the Python AI service is unavailable.
 */
@Slf4j
@Component
public class AiServiceClient {

    private final String aiServiceUrl;
    private final String aiServiceKey;
    private final RestTemplate restTemplate;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.misxmatch.casesvc.service.AiMetricTrackerService metricTracker;

    public AiServiceClient(
            @Value("${ai.service.url:http://127.0.0.1:8000}") String aiServiceUrl,
            @Value("${ai.service.key:misxmatch-internal-secret-key-2026}") String aiServiceKey,
            @Value("${ai.service.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${ai.service.read-timeout-ms:15000}") int readTimeoutMs) {
        
        this.aiServiceUrl = aiServiceUrl.replaceAll("/+$", "");
        this.aiServiceKey = aiServiceKey;
        
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(requestFactory);
        
        log.info("Initialized AiServiceClient with target URL: {} (connectTimeout: {}ms, readTimeout: {}ms)",
                this.aiServiceUrl, connectTimeoutMs, readTimeoutMs);
    }

    private void recordMetric(String opType, boolean success, long durationMs, String errCategory) {
        if (metricTracker != null) {
            try {
                String reqId = org.slf4j.MDC.get("requestId");
                metricTracker.recordMetric(opType, success, durationMs, errCategory, reqId);
            } catch (Exception e) {
                log.debug("Metric tracking exception: {}", e.getMessage());
            }
        }
    }

    private HttpHeaders createHeaders(MediaType mediaType) {
        HttpHeaders headers = new HttpHeaders();
        if (mediaType != null) {
            headers.setContentType(mediaType);
        }
        headers.set("X-Internal-Service-Key", aiServiceKey);
        String requestId = org.slf4j.MDC.get("requestId");
        if (requestId != null && !requestId.isBlank()) {
            headers.set("X-Request-ID", requestId);
        }
        return headers;
    }

    public String getAiServiceUrl() {
        return aiServiceUrl;
    }

    /**
     * 1. GET /health check
     */
    public Map<String, Object> checkHealth() {
        String endpoint = aiServiceUrl + "/health";
        log.debug("Calling AI Microservice Health Endpoint: {}", endpoint);
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(endpoint, Map.class);
            return response.getBody();
        } catch (ResourceAccessException e) {
            log.error("Python AI Microservice unavailable at {}: {}", endpoint, e.getMessage());
            throw new AiServiceUnavailableException("Python AI microservice is unreachable at " + endpoint, e);
        } catch (RestClientException e) {
            log.error("Failed to fetch health check from Python AI microservice: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI microservice health check failed: " + e.getMessage(), e);
        }
    }

    /**
     * 2. POST /api/ai/image-match (multipart/form-data)
     */
    public AiImageMatchResponse compareImages(byte[] image1Bytes, String file1Name, byte[] image2Bytes, String file2Name) {
        String endpoint = aiServiceUrl + "/api/ai/image-match";
        log.info("Sending image match request to Python AI service: {}", endpoint);
        long start = System.currentTimeMillis();

        try {
            HttpHeaders headers = createHeaders(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image1", new NamedByteArrayResource(image1Bytes, file1Name != null ? file1Name : "image1.jpg"));
            body.add("image2", new NamedByteArrayResource(image2Bytes, file2Name != null ? file2Name : "image2.jpg"));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<AiImageMatchResponse> response = restTemplate.postForEntity(endpoint, requestEntity, AiImageMatchResponse.class);
            recordMetric("FACE_MATCH", true, System.currentTimeMillis() - start, "NONE");
            return response.getBody();

        } catch (ResourceAccessException e) {
            recordMetric("FACE_MATCH", false, System.currentTimeMillis() - start, "AI_SERVICE_UNAVAILABLE");
            log.error("Python AI Microservice unavailable during image match: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during image match: " + e.getMessage(), e);
        } catch (RestClientException e) {
            recordMetric("FACE_MATCH", false, System.currentTimeMillis() - start, "MODEL_ERROR");
            log.error("Image match REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service image match request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 3. POST /api/ai/text-match
     */
    public AiTextMatchResponse compareTexts(AiTextMatchRequest request) {
        String endpoint = aiServiceUrl + "/api/ai/text-match";
        log.info("Sending NLP text match request to Python AI service: {}", endpoint);
        long start = System.currentTimeMillis();

        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<AiTextMatchRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<AiTextMatchResponse> response = restTemplate.postForEntity(endpoint, entity, AiTextMatchResponse.class);
            recordMetric("TEXT_MATCH", true, System.currentTimeMillis() - start, "NONE");
            return response.getBody();

        } catch (ResourceAccessException e) {
            recordMetric("TEXT_MATCH", false, System.currentTimeMillis() - start, "AI_SERVICE_UNAVAILABLE");
            log.error("Python AI Microservice unavailable during text match: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during text match: " + e.getMessage(), e);
        } catch (RestClientException e) {
            recordMetric("TEXT_MATCH", false, System.currentTimeMillis() - start, "MODEL_ERROR");
            log.error("Text match REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service text match request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 4. POST /api/ai/attribute-match
     */
    public AiAttributeMatchResponse compareAttributes(AiAttributeMatchRequest request) {
        String endpoint = aiServiceUrl + "/api/ai/attribute-match";
        log.info("Sending attribute match request to Python AI service: {}", endpoint);

        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<AiAttributeMatchRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<AiAttributeMatchResponse> response = restTemplate.postForEntity(endpoint, entity, AiAttributeMatchResponse.class);
            return response.getBody();

        } catch (ResourceAccessException e) {
            log.error("Python AI Microservice unavailable during attribute match: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during attribute match: " + e.getMessage(), e);
        } catch (RestClientException e) {
            log.error("Attribute match REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service attribute match request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 5. POST /api/ai/location-match
     */
    public AiLocationMatchResponse compareLocations(AiLocationMatchRequest request) {
        String endpoint = aiServiceUrl + "/api/ai/location-match";
        log.info("Sending location match request to Python AI service: {}", endpoint);

        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<AiLocationMatchRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<AiLocationMatchResponse> response = restTemplate.postForEntity(endpoint, entity, AiLocationMatchResponse.class);
            return response.getBody();

        } catch (ResourceAccessException e) {
            log.error("Python AI Microservice unavailable during location match: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during location match: " + e.getMessage(), e);
        } catch (RestClientException e) {
            log.error("Location match REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service location match request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 6. POST /api/ai/time-match
     */
    public AiTimeMatchResponse compareTimes(AiTimeMatchRequest request) {
        String endpoint = aiServiceUrl + "/api/ai/time-match";
        log.info("Sending time match request to Python AI service: {}", endpoint);

        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<AiTimeMatchRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<AiTimeMatchResponse> response = restTemplate.postForEntity(endpoint, entity, AiTimeMatchResponse.class);
            return response.getBody();

        } catch (ResourceAccessException e) {
            log.error("Python AI Microservice unavailable during time match: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during time match: " + e.getMessage(), e);
        } catch (RestClientException e) {
            log.error("Time match REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service time match request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 7. POST /api/ai/multi-match
     */
    public AiMultiMatchResponse compareMultiFactor(AiMultiMatchRequest request) {
        String endpoint = aiServiceUrl + "/api/ai/multi-match";
        log.info("Sending multi-factor match request to Python AI service: {}", endpoint);
        long start = System.currentTimeMillis();

        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<AiMultiMatchRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<AiMultiMatchResponse> response = restTemplate.postForEntity(endpoint, entity, AiMultiMatchResponse.class);
            recordMetric("MULTI_MATCH", true, System.currentTimeMillis() - start, "NONE");
            return response.getBody();

        } catch (ResourceAccessException e) {
            recordMetric("MULTI_MATCH", false, System.currentTimeMillis() - start, "AI_SERVICE_UNAVAILABLE");
            log.error("Python AI Microservice unavailable during multi-match: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during multi-match: " + e.getMessage(), e);
        } catch (RestClientException e) {
            recordMetric("MULTI_MATCH", false, System.currentTimeMillis() - start, "MODEL_ERROR");
            log.error("Multi-match REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service multi-match request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 9. POST /api/ai/cctv/analyze (Real CCTV Media Computer Vision & Biometric Analysis)
     */
    public Map<String, Object> analyzeCctvMedia(byte[] mediaBytes, String filename, String candidateRecordsJson, Float sampleIntervalSec) {
        String endpoint = aiServiceUrl + "/api/ai/cctv/analyze";
        log.info("Sending CCTV media computer vision analysis request to Python AI service: {}", endpoint);

        try {
            HttpHeaders headers = createHeaders(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new NamedByteArrayResource(mediaBytes, filename != null ? filename : "cctv_evidence.mp4"));
            if (candidateRecordsJson != null) {
                body.add("candidateRecordsJson", candidateRecordsJson);
            }
            if (sampleIntervalSec != null) {
                body.add("sampleIntervalSec", sampleIntervalSec);
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, requestEntity, Map.class);
            return response.getBody();

        } catch (ResourceAccessException e) {
            log.error("Python AI Microservice unavailable during CCTV media analysis: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during CCTV media analysis: " + e.getMessage(), e);
        } catch (RestClientException e) {
            log.error("CCTV media analysis REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service CCTV media analysis request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 8. POST /api/ai/risk-score
     */
    public AiRiskScoreResponse calculateRiskScore(AiRiskScoreRequest request) {
        String endpoint = aiServiceUrl + "/api/ai/risk-score";
        log.info("Sending risk score request to Python AI service: {}", endpoint);
        long start = System.currentTimeMillis();

        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<AiRiskScoreRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<AiRiskScoreResponse> response = restTemplate.postForEntity(endpoint, entity, AiRiskScoreResponse.class);
            recordMetric("RISK_SCORE", true, System.currentTimeMillis() - start, "NONE");
            return response.getBody();

        } catch (ResourceAccessException e) {
            recordMetric("RISK_SCORE", false, System.currentTimeMillis() - start, "AI_SERVICE_UNAVAILABLE");
            log.error("Python AI Microservice unavailable during risk score calculation: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service unavailable during risk score calculation: " + e.getMessage(), e);
        } catch (RestClientException e) {
            recordMetric("RISK_SCORE", false, System.currentTimeMillis() - start, "MODEL_ERROR");
            log.error("Risk score REST call failed: {}", e.getMessage());
            throw new AiServiceUnavailableException("Python AI service risk score request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 9. GET /api/ai/evaluation/all
     */
    public Map<String, Object> getFullEvaluationReport(double faceThreshold, double textThreshold) {
        String endpoint = String.format("%s/api/ai/evaluation/all?face_threshold=%.2f&text_threshold=%.2f", aiServiceUrl, faceThreshold, textThreshold);
        log.info("Fetching full AI model evaluation report from Python service: {}", endpoint);
        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(endpoint, HttpMethod.GET, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.warn("Failed to fetch full evaluation report from Python AI service: {}", e.getMessage());
            return Map.of("status", "UNAVAILABLE", "message", e.getMessage());
        }
    }

    /**
     * 10. GET /api/ai/evaluation/calibration
     */
    public Map<String, Object> getCalibrationMetadata() {
        String endpoint = aiServiceUrl + "/api/ai/evaluation/calibration";
        log.info("Fetching calibration and threshold metadata from Python service: {}", endpoint);
        try {
            HttpHeaders headers = createHeaders(MediaType.APPLICATION_JSON);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(endpoint, HttpMethod.GET, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.warn("Failed to fetch calibration metadata from Python AI service: {}", e.getMessage());
            return Map.of("status", "UNAVAILABLE", "message", e.getMessage());
        }
    }

    /**
     * ByteArrayResource helper to override filename for Spring RestTemplate multipart uploads
     */
    private static class NamedByteArrayResource extends ByteArrayResource {
        private final String filename;

        public NamedByteArrayResource(byte[] byteArray, String filename) {
            super(byteArray);
            this.filename = filename;
        }

        @Override
        public String getFilename() {
            return this.filename;
        }
    }
}
