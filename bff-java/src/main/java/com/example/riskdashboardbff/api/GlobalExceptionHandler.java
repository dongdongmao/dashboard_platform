package com.example.riskdashboardbff.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Instant;
import java.util.concurrent.TimeoutException;

/**
 * Global exception handler for the BFF API.
 * Provides consistent error responses and logging for all unhandled exceptions.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Standard error response structure.
     */
    public record ErrorResponse(
            String error,
            String message,
            int status,
            String timestamp
    ) {
        public static ErrorResponse of(String error, String message, int status) {
            return new ErrorResponse(error, message, status, Instant.now().toString());
        }
    }

    /**
     * Handle timeout exceptions from downstream services.
     */
    @ExceptionHandler(TimeoutException.class)
    public ResponseEntity<ErrorResponse> handleTimeout(TimeoutException ex) {
        log.error("Request timeout: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.GATEWAY_TIMEOUT)
                .body(ErrorResponse.of(
                        "GATEWAY_TIMEOUT",
                        "Downstream service did not respond in time",
                        HttpStatus.GATEWAY_TIMEOUT.value()
                ));
    }

    /**
     * Handle WebClient errors from downstream services.
     */
    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<ErrorResponse> handleWebClientError(WebClientResponseException ex) {
        log.error("Downstream service error: {} - {}", ex.getStatusCode(), ex.getMessage());
        
        if (ex.getStatusCode().is5xxServerError()) {
            return ResponseEntity
                    .status(HttpStatus.BAD_GATEWAY)
                    .body(ErrorResponse.of(
                            "BAD_GATEWAY",
                            "Downstream service returned an error",
                            HttpStatus.BAD_GATEWAY.value()
                    ));
        }
        
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(
                        "DOWNSTREAM_ERROR",
                        "Error communicating with downstream service",
                        HttpStatus.INTERNAL_SERVER_ERROR.value()
                ));
    }

    /**
     * Handle all other unexpected exceptions.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(
                        "INTERNAL_SERVER_ERROR",
                        "An unexpected error occurred",
                        HttpStatus.INTERNAL_SERVER_ERROR.value()
                ));
    }
}
