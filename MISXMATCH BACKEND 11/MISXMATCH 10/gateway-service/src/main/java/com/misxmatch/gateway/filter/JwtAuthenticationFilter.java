package com.misxmatch.gateway.filter;

import com.misxmatch.gateway.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.reactive.CorsUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Global filter that runs for every request that passes through the gateway.
 * Public (no-auth) routes are whitelisted; everything else must present a
 * valid JWT. On success, the filter strips the incoming Authorization header
 * and instead forwards trusted identity headers (X-User-Id, X-Username,
 * X-User-Role) so downstream services never have to re-verify the token —
 * they simply trust requests that arrive via the internal Docker network
 * from the gateway.
 */
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtUtil jwtUtil;

    private static final List<String> OPEN_PATHS = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/forgot-password",
            "/api/auth/verify-reset-otp",
            "/api/auth/reset-password",
            "/api/auth/send-otp",
            "/api/auth/verify-otp",
            "/api/auth/resend-otp",
            "/api/auth/aadhaar/request-otp",
            "/api/auth/aadhaar/verify-otp",
            "/api/auth/aadhaar/login-password",
            "/api/dashboard/public",
            "/api/cases/files",
            "/actuator",
            "/swagger-ui",
            "/v3/api-docs"
    );

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        if (CorsUtils.isPreFlightRequest(request)) {
            return chain.filter(exchange);
        }
        String path = request.getURI().getPath();

        boolean isSuperAdmin = path.startsWith("/api/auth/super-admin");
        boolean isOpen = (!isSuperAdmin && path.startsWith("/api/auth/"))
                || OPEN_PATHS.stream().anyMatch(path::startsWith)
                || (isPublicGet(path) && "GET".equalsIgnoreCase(request.getMethod().name()));

        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty() && authHeaders.get(0).startsWith("Bearer ")) {
            String token = authHeaders.get(0).substring(7);
            if (jwtUtil.isValid(token)) {
                Claims claims = jwtUtil.parseClaims(token);
                String userId = claims.getSubject();
                String role = String.valueOf(claims.get("role"));
                String username = String.valueOf(claims.get("username"));
                String superAdmin = String.valueOf(claims.get("superAdmin"));

                ServerHttpRequest mutated = request.mutate()
                        .header("X-User-Id", userId)
                        .header("X-User-Role", role)
                        .header("X-Username", username)
                        .header("X-User-Super-Admin", superAdmin)
                        .build();

                return chain.filter(exchange.mutate().request(mutated).build());
            }
        }

        if (isOpen) {
            ServerHttpRequest sanitized = request.mutate()
                    .headers(httpHeaders -> {
                        httpHeaders.remove("X-User-Id");
                        httpHeaders.remove("X-User-Role");
                        httpHeaders.remove("X-Username");
                    })
                    .build();
            return chain.filter(exchange.mutate().request(sanitized).build());
        }

        return unauthorized(exchange, "Missing bearer token");
    }

    private boolean isPublicGet(String path) {
        return path.startsWith("/api/cases/missing")
                || path.startsWith("/api/cases/found")
                || path.startsWith("/api/cases/status")
                || path.startsWith("/api/cases/stats")
                || path.startsWith("/api/cases/active")
                || path.startsWith("/api/cases/files")
                || path.startsWith("/api/dashboard/public");
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        byte[] bytes = ("{\"error\":\"" + message + "\"}").getBytes();
        return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
