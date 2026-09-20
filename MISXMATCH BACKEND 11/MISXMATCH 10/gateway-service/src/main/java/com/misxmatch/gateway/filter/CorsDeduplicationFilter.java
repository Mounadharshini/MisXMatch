package com.misxmatch.gateway.filter;

import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Ensures that CORS headers (such as Access-Control-Allow-Origin and Access-Control-Allow-Credentials)
 * are never duplicated if both the API Gateway and downstream microservices contribute CORS headers.
 * Duplicate Access-Control-Allow-Origin headers cause modern browsers to block requests with a CORS error.
 */
@Component
public class CorsDeduplicationFilter implements WebFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        exchange.getResponse().beforeCommit(() -> {
            HttpHeaders headers = exchange.getResponse().getHeaders();
            dedupeHeader(headers, HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
            dedupeHeader(headers, HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS);
            dedupeHeader(headers, HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS);
            dedupeHeader(headers, HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS);
            dedupeHeader(headers, HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS);
            dedupeHeader(headers, HttpHeaders.VARY);
            return Mono.empty();
        });
        return chain.filter(exchange);
    }

    private void dedupeHeader(HttpHeaders headers, String headerName) {
        List<String> values = headers.get(headerName);
        if (values != null && values.size() > 1) {
            String first = values.get(0);
            headers.set(headerName, first);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
