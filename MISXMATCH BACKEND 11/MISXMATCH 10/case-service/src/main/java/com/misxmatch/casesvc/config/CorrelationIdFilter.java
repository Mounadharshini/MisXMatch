package com.misxmatch.casesvc.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter implements Filter {

    public static final String CORRELATION_HEADER = "X-Request-ID";
    public static final String MDC_KEY = "requestId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest httpRequest && response instanceof HttpServletResponse httpResponse) {
            String existingRequestId = httpRequest.getHeader(CORRELATION_HEADER);
            if (existingRequestId == null || existingRequestId.isBlank()) {
                existingRequestId = httpRequest.getHeader("requestId");
            }

            String requestId = (existingRequestId != null && !existingRequestId.isBlank())
                    ? existingRequestId
                    : "req-" + UUID.randomUUID().toString().substring(0, 12);

            MDC.put(MDC_KEY, requestId);
            httpResponse.setHeader(CORRELATION_HEADER, requestId);

            try {
                chain.doFilter(request, response);
            } finally {
                MDC.remove(MDC_KEY);
            }
        } else {
            chain.doFilter(request, response);
        }
    }
}
