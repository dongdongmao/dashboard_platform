package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.TradingSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingOrder;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingFill;
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
 * WebClient-based client that calls the mock trading service container.
 * Includes timeout, retry, and fallback mechanisms for production-grade resilience.
 */
@Service
public class TradingMetricsClient implements TradingServiceClient {

    private static final Logger log = LoggerFactory.getLogger(TradingMetricsClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final int MAX_RETRIES = 2;

    private final WebClient webClient;

    public TradingMetricsClient(
            WebClient.Builder builder,
            @Value("${downstream.trading.base-url}") String baseUrl
    ) {
        this.webClient = builder.baseUrl(baseUrl).build();
    }

    public Mono<TradingSummary> fetchTradingSummary() {
        return webClient.get()
                .uri("/api/trading/summary")
                .retrieve()
                .bodyToMono(TradingSummary.class)
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchTradingSummary, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch trading summary after retries: {}", e.getMessage());
                    return Mono.just(new TradingSummary(0, 0, 0.0));
                });
    }

    public Mono<List<TradingOrder>> fetchOpenOrders() {
        return webClient.get()
                .uri("/api/trading/orders")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<TradingOrder>>() {})
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchOpenOrders, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch open orders after retries: {}", e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    public Mono<List<TradingFill>> fetchRecentFills() {
        return webClient.get()
                .uri("/api/trading/fills")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<TradingFill>>() {})
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchRecentFills, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch recent fills after retries: {}", e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    private boolean isRetryable(Throwable throwable) {
        if (throwable instanceof WebClientResponseException ex) {
            return ex.getStatusCode().is5xxServerError();
        }
        return true;
    }
}
