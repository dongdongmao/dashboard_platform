package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.TradingSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingOrder;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingFill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * WebClient-based client that calls the mock trading service container.
 * Demonstrates multiple concurrent I/O calls to fetch different data sets.
 */
@Service
public class TradingMetricsClient {

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
                .bodyToMono(TradingSummary.class);
    }

    public Mono<List<TradingOrder>> fetchOpenOrders() {
        return webClient.get()
                .uri("/api/trading/orders")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<TradingOrder>>() {});
    }

    public Mono<List<TradingFill>> fetchRecentFills() {
        return webClient.get()
                .uri("/api/trading/fills")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<TradingFill>>() {});
    }
}

