package com.misxmatch.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Component
public class RequestLoggingFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
    public static final String CORRELATION_HEADER = "X-Request-ID";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        Instant start = Instant.now();
        String existingRequestId = exchange.getRequest().getHeaders().getFirst(CORRELATION_HEADER);
        String requestId = (existingRequestId != null && !existingRequestId.isBlank())
                ? existingRequestId
                : "req-" + UUID.randomUUID().toString().substring(0, 12);

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header(CORRELATION_HEADER, requestId)
                .build();

        exchange.getResponse().getHeaders().set(CORRELATION_HEADER, requestId);

        ServerWebExchange mutatedExchange = exchange.mutate().request(mutatedRequest).build();
        String method = mutatedRequest.getMethod().name();
        String path = mutatedRequest.getURI().getPath();

        return chain.filter(mutatedExchange).doFinally(signal -> {
            long ms = java.time.Duration.between(start, Instant.now()).toMillis();
            int status = mutatedExchange.getResponse().getStatusCode() != null
                    ? mutatedExchange.getResponse().getStatusCode().value() : 0;
            log.info("[GATEWAY] [{}] {} {} -> {} ({} ms)", requestId, method, path, status, ms);
        });
    }

    @Override
    public int getOrder() {
        return -2;
    }
}

