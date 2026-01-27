package com.example.mockrisk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Controller that reads mock data from Redis, demonstrating a realistic caching scenario.
 * Still includes simulated latency to maintain the multi-I/O demonstration effect.
 */
@RestController
public class RiskController {

    private static final Logger log = LoggerFactory.getLogger(RiskController.class);
    private static final String RISK_SUMMARY_KEY = "risk:summary";
    private static final String RISK_ACCOUNTS_KEY = "risk:accounts";
    private static final String RISK_METRICS_KEY = "risk:metrics";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();
    private static final String[] BOOKS = {"EQUITIES", "FUTURES", "OPTIONS", "FX", "CREDIT", "RATES", "COMMODITIES", "BONDS"};

    public RiskController(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/api/risk/summary")
    public RiskSummary getRiskSummary() throws InterruptedException {
        // Simulate 80–150 ms latency (includes Redis read + network overhead)
        long latency = 80 + random.nextInt(71);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(RISK_SUMMARY_KEY);
            if (json != null) {
                return objectMapper.readValue(json, RiskSummary.class);
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
        return new RiskSummary(
                5_000_000d + random.nextDouble() * 1_000_000d,
                0.6 + random.nextDouble() * 0.3
        );
    }

    @GetMapping("/api/risk/accounts")
    public List<RiskAccount> getRiskAccounts() throws InterruptedException {
        // Simulate 100–200 ms latency (includes Redis read + network overhead)
        long latency = 100 + random.nextInt(101);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(RISK_ACCOUNTS_KEY);
            if (json != null) {
                return objectMapper.readValue(json, new TypeReference<List<RiskAccount>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
        List<RiskAccount> accounts = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            String accountId = String.format("ACC-%03d", i);
            String book = BOOKS[random.nextInt(BOOKS.length)];
            double exposure = 100_000d + random.nextDouble() * 2_000_000d;
            double utilization = 0.2 + random.nextDouble() * 0.7;
            accounts.add(new RiskAccount(accountId, book, exposure, utilization));
        }
        return accounts;
    }

    @GetMapping("/api/risk/metrics")
    public List<RiskMetric> getRiskMetrics() throws InterruptedException {
        // Simulate 90–180 ms latency (includes Redis read + network overhead)
        long latency = 90 + random.nextInt(91);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(RISK_METRICS_KEY);
            if (json != null) {
                return objectMapper.readValue(json, new TypeReference<List<RiskMetric>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
        List<RiskMetric> metrics = new ArrayList<>();
        String[] metricTypes = {"VaR", "CVaR", "StressTest", "Leverage", "Concentration"};
        for (String type : metricTypes) {
            double value = random.nextDouble() * 1_000_000d;
            String status = random.nextDouble() > 0.7 ? "WARNING" : "OK";
            metrics.add(new RiskMetric(type, value, status));
        }
        return metrics;
    }

    @GetMapping("/api/risk/ping")
    public void ping() throws InterruptedException {
        // Simple ping endpoint with a small fixed delay
        Thread.sleep(50);
    }

    public record RiskSummary(
            double totalNetExposure,
            double maxMarginUtilization
    ) {}

    public record RiskAccount(
            String accountId,
            String book,
            double exposure,
            double utilization
    ) {}

    public record RiskMetric(
            String metricType,
            double value,
            String status
    ) {}
}

