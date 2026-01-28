package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel;
import com.example.riskdashboardbff.model.DashboardViewModel.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.ReactiveZSetOperations;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for DashboardAggregationService.
 * Uses mocked dependencies to test aggregation logic in isolation.
 */
@ExtendWith(MockitoExtension.class)
class DashboardAggregationServiceUnitTest {

    @Mock
    private ReactiveStringRedisTemplate redisTemplate;
    
    @Mock
    private ReactiveZSetOperations<String, String> zSetOperations;
    
    @Mock
    private RiskServiceClient riskServiceClient;
    
    @Mock
    private TradingServiceClient tradingServiceClient;
    
    @Mock
    private LatencyMetricsClient latencyMetricsClient;
    
    @Mock
    private LedgerServiceClient ledgerServiceClient;

    private DashboardAggregationService service;

    @BeforeEach
    void setUp() {
        service = new DashboardAggregationService(
                redisTemplate,
                riskServiceClient,
                tradingServiceClient,
                latencyMetricsClient,
                ledgerServiceClient
        );
    }

    @Test
    void aggregate_ShouldCombineAllServiceResponses() {
        // Arrange - Mock Redis to return empty (trigger in-memory seeding)
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(zSetOperations.reverseRangeWithScores(anyString(), any(Range.class)))
                .thenReturn(Flux.empty());
        when(zSetOperations.add(anyString(), anyString(), any(Double.class)))
                .thenReturn(Mono.just(true));

        // Mock service responses
        RiskSummary riskSummary = new RiskSummary(5_000_000.0, 0.75);
        TradingSummary tradingSummary = new TradingSummary(50, 200, 15_000.0);
        LatencyMetrics latencyMetrics = new LatencyMetrics(100.0, 120.0, 80.0);
        
        when(riskServiceClient.fetchRiskSummary()).thenReturn(Mono.just(riskSummary));
        when(riskServiceClient.fetchRiskAccounts()).thenReturn(Mono.just(List.of(
                new RiskAccount("ACC-001", "EQUITIES", 1_000_000.0, 0.8)
        )));
        when(riskServiceClient.fetchRiskMetrics()).thenReturn(Mono.just(List.of(
                new RiskMetric("VaR", 50_000.0, "OK")
        )));
        
        when(tradingServiceClient.fetchTradingSummary()).thenReturn(Mono.just(tradingSummary));
        when(tradingServiceClient.fetchOpenOrders()).thenReturn(Mono.just(List.of(
                new TradingOrder("ORD-001", "AAPL", "BUY", 100, 150.0, "PENDING")
        )));
        when(tradingServiceClient.fetchRecentFills()).thenReturn(Mono.just(List.of(
                new TradingFill("FILL-001", "MSFT", "SELL", 50, 350.0, 500.0)
        )));
        
        when(ledgerServiceClient.fetchAccountBalances()).thenReturn(Mono.just(List.of(
                new AccountBalance("ACC-001", "USD", 100_000.0, 20_000.0, 80_000.0)
        )));
        when(ledgerServiceClient.fetchRecentTransactions()).thenReturn(Mono.just(List.of(
                new Transaction("TX-001", "ACC-001", "TRADE", "USD", 5_000.0, "SETTLED")
        )));
        
        when(latencyMetricsClient.measureLatencies()).thenReturn(Mono.just(latencyMetrics));

        // Act & Assert
        StepVerifier.create(service.aggregate())
                .expectNextMatches(viewModel -> {
                    // Verify all data is aggregated correctly
                    return viewModel.health() != null
                            && "HEALTHY".equals(viewModel.health().status())
                            && viewModel.riskSummary().equals(riskSummary)
                            && viewModel.tradingSummary().equals(tradingSummary)
                            && viewModel.latencyMetrics().equals(latencyMetrics)
                            && !viewModel.riskAccounts().isEmpty()
                            && !viewModel.riskMetrics().isEmpty()
                            && !viewModel.openOrders().isEmpty()
                            && !viewModel.recentFills().isEmpty()
                            && !viewModel.accountBalances().isEmpty()
                            && !viewModel.recentTransactions().isEmpty();
                })
                .verifyComplete();
    }

    @Test
    void aggregate_ShouldHandleEmptyResponses() {
        // Arrange - Mock Redis to return empty
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(zSetOperations.reverseRangeWithScores(anyString(), any(Range.class)))
                .thenReturn(Flux.empty());
        when(zSetOperations.add(anyString(), anyString(), any(Double.class)))
                .thenReturn(Mono.just(true));

        // Mock empty responses (simulating fallback behavior)
        when(riskServiceClient.fetchRiskSummary()).thenReturn(Mono.just(new RiskSummary(0.0, 0.0)));
        when(riskServiceClient.fetchRiskAccounts()).thenReturn(Mono.just(List.of()));
        when(riskServiceClient.fetchRiskMetrics()).thenReturn(Mono.just(List.of()));
        
        when(tradingServiceClient.fetchTradingSummary()).thenReturn(Mono.just(new TradingSummary(0, 0, 0.0)));
        when(tradingServiceClient.fetchOpenOrders()).thenReturn(Mono.just(List.of()));
        when(tradingServiceClient.fetchRecentFills()).thenReturn(Mono.just(List.of()));
        
        when(ledgerServiceClient.fetchAccountBalances()).thenReturn(Mono.just(List.of()));
        when(ledgerServiceClient.fetchRecentTransactions()).thenReturn(Mono.just(List.of()));
        
        when(latencyMetricsClient.measureLatencies()).thenReturn(Mono.just(new LatencyMetrics(0.0, 0.0, 0.0)));

        // Act & Assert
        StepVerifier.create(service.aggregate())
                .expectNextMatches(viewModel -> 
                        viewModel.health() != null
                        && viewModel.riskAccounts().isEmpty()
                        && viewModel.openOrders().isEmpty()
                        && viewModel.accountBalances().isEmpty()
                )
                .verifyComplete();
    }
}
