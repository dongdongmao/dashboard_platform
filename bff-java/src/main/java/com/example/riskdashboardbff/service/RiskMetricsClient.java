package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.RiskSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskAccount;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskMetric;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * WebClient-based client that calls the mock risk service container.
 * Demonstrates multiple concurrent I/O calls to the same downstream service.
 */
@Service
public class RiskMetricsClient {

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
                .bodyToMono(RiskSummary.class);
    }

    public Mono<List<RiskAccount>> fetchRiskAccounts() {
        return webClient.get()
                .uri("/api/risk/accounts")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<RiskAccount>>() {});
    }

    public Mono<List<RiskMetric>> fetchRiskMetrics() {
        return webClient.get()
                .uri("/api/risk/metrics")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<RiskMetric>>() {});
    }
}

