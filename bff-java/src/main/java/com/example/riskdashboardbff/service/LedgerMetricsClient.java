package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.AccountBalance;
import com.example.riskdashboardbff.model.DashboardViewModel.Transaction;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * WebClient-based client that calls the mock ledger service container.
 * Demonstrates multiple concurrent I/O calls to fetch balance and transaction data.
 */
@Service
public class LedgerMetricsClient {

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
                .bodyToMono(new ParameterizedTypeReference<List<AccountBalance>>() {});
    }

    public Mono<List<Transaction>> fetchRecentTransactions() {
        return webClient.get()
                .uri("/api/ledger/transactions")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<Transaction>>() {});
    }
}
