package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.AccountBalance;
import com.example.riskdashboardbff.model.DashboardViewModel.Transaction;
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
 * WebClient-based client that calls the mock ledger service container.
 * Includes timeout, retry, and fallback mechanisms for production-grade resilience.
 */
@Service
public class LedgerMetricsClient implements LedgerServiceClient {

    private static final Logger log = LoggerFactory.getLogger(LedgerMetricsClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final int MAX_RETRIES = 2;

    private final WebClient webClient;

    public LedgerMetricsClient(
            WebClient.Builder builder,
            @Value("${downstream.ledger.base-url}") String baseUrl
    ) {
        this.webClient = builder.baseUrl(baseUrl).build();
    }

    public Mono<List<AccountBalance>> fetchAccountBalances() {
        return webClient.get()
                .uri("/api/ledger/balances")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<AccountBalance>>() {})
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchAccountBalances, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch account balances after retries: {}", e.getMessage());
                    return Mono.just(Collections.emptyList());
                });
    }

    public Mono<List<Transaction>> fetchRecentTransactions() {
        return webClient.get()
                .uri("/api/ledger/transactions")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<Transaction>>() {})
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofMillis(100))
                        .filter(this::isRetryable)
                        .doBeforeRetry(signal -> log.warn("Retrying fetchRecentTransactions, attempt {}", signal.totalRetries() + 1)))
                .onErrorResume(e -> {
                    log.error("Failed to fetch recent transactions after retries: {}", e.getMessage());
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
