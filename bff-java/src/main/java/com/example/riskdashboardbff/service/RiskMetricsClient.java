package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.RiskSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskAccount;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskMetric;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * WebClient-based client that calls the mock risk service container.
 * Includes timeout, retry, and fallback mechanisms for production-grade resilience.
 */
@Service
public class RiskMetricsClient implements RiskServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RiskMetricsClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final int MAX_RETRIES = 2;

    private final WebClient webClient;

    public RiskMetricsClient(
            WebClient.Builder builder,
            @Value("${downstream.risk.base-url}") String baseUrl
    ) {
        this.webClient = builder.baseUrl(baseUrl).build();
    }

    public Mono<RiskSummary> fetchRiskSummary() {
        return webClient.get()
                .uri("/api/risk/summary")
                .retrieve()
                .bodyToMono(RiskSummary.class)
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchRiskSummary, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch risk summary after retries: {}", e.getMessage());
                    return Mono.just(new RiskSummary(0.0, 0.0));
                });
    }

    public Mono<List<RiskAccount>> fetchRiskAccounts() {
        return webClient.get()
                .uri("/api/risk/accounts")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<RiskAccount>>() {})
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchRiskAccounts, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch risk accounts after retries: {}", e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    public Mono<List<RiskMetric>> fetchRiskMetrics() {
        return webClient.get()
                .uri("/api/risk/metrics")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<RiskMetric>>() {})
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchRiskMetrics, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch risk metrics after retries: {}", e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    /**
     * Determines if an exception is retryable.
     * We retry on connection errors and 5xx server errors, but not on 4xx client errors.
     */
    private boolean isRetryable(Throwable throwable) {
        if (throwable instanceof WebClientResponseException ex) {
            return ex.getStatusCode().is5xxServerError();
        }
        // Retry on timeout and connection errors
        return true;
    }
}
