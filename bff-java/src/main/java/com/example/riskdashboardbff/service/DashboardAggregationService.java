package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskyAccount;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.SystemHealth;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.LatencyMetrics;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskAccount;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskMetric;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingOrder;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingFill;
import com.example.riskdashboardbff.model.DashboardViewModel.AccountBalance;
import com.example.riskdashboardbff.model.DashboardViewModel.Transaction;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class DashboardAggregationService {

    private static final String TOP_RISK_KEY = "top:risky:accounts";

    private final ReactiveStringRedisTemplate redisTemplate;
    private final RiskMetricsClient riskMetricsClient;
    private final TradingMetricsClient tradingMetricsClient;
    private final LatencyMetricsClient latencyMetricsClient;
    private final LedgerMetricsClient ledgerMetricsClient;

    public DashboardAggregationService(
            ReactiveStringRedisTemplate redisTemplate,
            RiskMetricsClient riskMetricsClient,
            TradingMetricsClient tradingMetricsClient,
            LatencyMetricsClient latencyMetricsClient,
            LedgerMetricsClient ledgerMetricsClient
    ) {
        this.redisTemplate = redisTemplate;
        this.riskMetricsClient = riskMetricsClient;
        this.tradingMetricsClient = tradingMetricsClient;
        this.latencyMetricsClient = latencyMetricsClient;
        this.ledgerMetricsClient = ledgerMetricsClient;
    }

    public Mono<DashboardViewModel> aggregate() {
        // 1) Accounts: Redis-backed Top N, seeded from in-memory mock data if empty.
        Flux<RiskyAccount> accountsFlux = loadTopAccountsFromRedis()
                .switchIfEmpty(seedAndLoadTopAccounts());
        Mono<List<RiskyAccount>> accounts = accountsFlux.collectList();

        // 2) Multiple concurrent calls to downstream services via non-blocking IO.
        // This demonstrates true fan-out/fan-in behavior with real HTTP I/O.
        Mono<SystemHealth> health = loadSystemHealth();
        Mono<RiskSummary> riskSummary = riskMetricsClient.fetchRiskSummary();
        Mono<TradingSummary> tradingSummary = tradingMetricsClient.fetchTradingSummary();
        Mono<LatencyMetrics> latencyMetrics = latencyMetricsClient.measureLatencies();

        // 3) Additional data fetches from each service to show rich data aggregation.
        Mono<List<RiskAccount>> riskAccounts = riskMetricsClient.fetchRiskAccounts();
        Mono<List<RiskMetric>> riskMetrics = riskMetricsClient.fetchRiskMetrics();
        Mono<List<TradingOrder>> openOrders = tradingMetricsClient.fetchOpenOrders();
        Mono<List<TradingFill>> recentFills = tradingMetricsClient.fetchRecentFills();
        Mono<List<AccountBalance>> accountBalances = ledgerMetricsClient.fetchAccountBalances();
        Mono<List<Transaction>> recentTransactions = ledgerMetricsClient.fetchRecentTransactions();

        // 4) Zip all Mono sources together to demonstrate concurrent aggregation.
        // Mono.zip() with Function accepts variable arguments (up to 16), perfect for 11 sources
        return Mono.zip(
                tuple -> new DashboardViewModel(
                        (List<RiskyAccount>) tuple[0],           // accounts
                        (SystemHealth) tuple[1],                 // health
                        (RiskSummary) tuple[2],                  // riskSummary
                        (TradingSummary) tuple[3],               // tradingSummary
                        (LatencyMetrics) tuple[4],               // latencyMetrics
                        (List<RiskAccount>) tuple[5],            // riskAccounts
                        (List<RiskMetric>) tuple[6],             // riskMetrics
                        (List<TradingOrder>) tuple[7],           // openOrders
                        (List<TradingFill>) tuple[8],            // recentFills
                        (List<AccountBalance>) tuple[9],         // accountBalances
                        (List<Transaction>) tuple[10]             // recentTransactions
                ),
                accounts,
                health,
                riskSummary,
                tradingSummary,
                latencyMetrics,
                riskAccounts,
                riskMetrics,
                openOrders,
                recentFills,
                accountBalances,
                recentTransactions
        );
    }

    private Flux<RiskyAccount> loadPositionsInMemory() {
        // In the real system this would fan-out to multiple risk / trading / ledger services.
        // Here we simulate it with in-memory mock data and small artificial latency.
        return Flux.just(
                        new RiskyAccount("ACC-001", "EQUITIES", 1_500_000.0, 0.82),
                        new RiskyAccount("ACC-002", "FUTURES", 1_250_000.0, 0.76),
                        new RiskyAccount("ACC-003", "OPTIONS", 980_000.0, 0.68),
                        new RiskyAccount("ACC-004", "FX", 730_000.0, 0.59),
                        new RiskyAccount("ACC-005", "CREDIT", 510_000.0, 0.44),
                        new RiskyAccount("ACC-006", "RATES", 430_000.0, 0.37)
                )
                .delayElements(Duration.ofMillis(30));
    }

    private Mono<SystemHealth> loadSystemHealth() {
        // Simulate concurrent calls to downstream health endpoints aggregated into a single view.
        return Mono.just(new SystemHealth(
                "HEALTHY",
                120.0,
                5,
                5
        )).delayElement(Duration.ofMillis(40));
    }

    private Flux<RiskyAccount> loadTopAccountsFromRedis() {
        Range<Long> range = Range.closed(0L, 4L); // Top 5 elements: index 0 ~ 4
        return redisTemplate.opsForZSet()
                .reverseRangeWithScores(TOP_RISK_KEY, range)
                .map(tuple -> {
                    String member = tuple.getValue();
                    double score = tuple.getScore();
                    Map<String, String> parsed = Map.ofEntries(
                            Map.entry("ACC-001", "EQUITIES"),
                            Map.entry("ACC-002", "FUTURES"),
                            Map.entry("ACC-003", "OPTIONS"),
                            Map.entry("ACC-004", "FX"),
                            Map.entry("ACC-005", "CREDIT"),
                            Map.entry("ACC-006", "RATES")
                    );
                    String book = parsed.getOrDefault(member, "UNKNOWN");
                    double utilization = switch (member) {
                        case "ACC-001" -> 0.82;
                        case "ACC-002" -> 0.76;
                        case "ACC-003" -> 0.68;
                        case "ACC-004" -> 0.59;
                        case "ACC-005" -> 0.44;
                        case "ACC-006" -> 0.37;
                        default -> 0.0;
                    };
                    return new RiskyAccount(member, book, score, utilization);
                });
    }

    private Flux<RiskyAccount> seedAndLoadTopAccounts() {
        Flux<RiskyAccount> inMemory = loadPositionsInMemory()
                .sort(Comparator.comparingDouble(RiskyAccount::netExposure).reversed())
                .take(5);

        return inMemory
                .flatMap(account -> redisTemplate.opsForZSet()
                        .add(TOP_RISK_KEY, account.accountId(), account.netExposure())
                        .thenReturn(account))
                .thenMany(loadTopAccountsFromRedis());
    }
}

