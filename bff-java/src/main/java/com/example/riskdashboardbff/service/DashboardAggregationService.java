package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskyAccount;
import com.example.riskdashboardbff.model.DashboardViewModel.SystemHealth;
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

    public DashboardAggregationService(ReactiveStringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Mono<DashboardViewModel> aggregate() {
        // Compose a Flux of accounts: try Redis first, then seed Redis and reload if empty
        Flux<RiskyAccount> accountsFlux = loadTopAccountsFromRedis()
                .switchIfEmpty(seedAndLoadTopAccounts());

        Mono<List<RiskyAccount>> accounts = accountsFlux.collectList();
        Mono<SystemHealth> health = loadSystemHealth();

        return Mono.zip(accounts, health)
                .map(tuple -> new DashboardViewModel(tuple.getT1(), tuple.getT2()));
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

