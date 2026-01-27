package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.LatencyMetrics;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * WebClient-based latency client that measures round-trip times to three
 * downstream mock services (risk, trading, ledger) using dedicated ping
 * endpoints. This models real HTTP fan-out/fan-in behavior.
 */
@Service
public class LatencyMetricsClient {

    private final WebClient riskClient;
    private final WebClient tradingClient;
    private final WebClient ledgerClient;

    public LatencyMetricsClient(
            WebClient.Builder builder,
            @Value("${downstream.risk.base-url}") String riskBaseUrl,
            @Value("${downstream.trading.base-url}") String tradingBaseUrl,
            @Value("${downstream.ledger.base-url}") String ledgerBaseUrl
    ) {
        this.riskClient = builder.baseUrl(riskBaseUrl).build();
        this.tradingClient = builder.baseUrl(tradingBaseUrl).build();
        this.ledgerClient = builder.baseUrl(ledgerBaseUrl).build();
    }

    public Mono<LatencyMetrics> measureLatencies() {
        Mono<Double> riskLatency = measure(riskClient, "/api/risk/ping");
        Mono<Double> tradingLatency = measure(tradingClient, "/api/trading/ping");
        Mono<Double> ledgerLatency = measure(ledgerClient, "/api/ledger/ping");

        return Mono.zip(riskLatency, tradingLatency, ledgerLatency)
                .map(tuple -> new LatencyMetrics(
                        tuple.getT1(),
                        tuple.getT2(),
                        tuple.getT3()
                ));
    }

    private Mono<Double> measure(WebClient client, String path) {
        long start = System.nanoTime();
        return client.get()
                .uri(path)
                .retrieve()
                .bodyToMono(Void.class)
                .then(Mono.fromSupplier(() -> {
                    long elapsedNanos = System.nanoTime() - start;
                    return elapsedNanos / 1_000_000.0d;
                }));
    }
}

