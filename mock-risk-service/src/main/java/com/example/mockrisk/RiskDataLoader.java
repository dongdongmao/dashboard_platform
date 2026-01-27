package com.example.mockrisk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Pre-loads mock risk data into Redis on application startup.
 * This demonstrates a realistic caching scenario where downstream services
 * read from Redis instead of generating data on-the-fly.
 */
@Component
public class RiskDataLoader {

    private static final Logger log = LoggerFactory.getLogger(RiskDataLoader.class);
    private static final String RISK_SUMMARY_KEY = "risk:summary";
    private static final String RISK_ACCOUNTS_KEY = "risk:accounts";
    private static final String RISK_METRICS_KEY = "risk:metrics";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();
    private static final String[] BOOKS = {"EQUITIES", "FUTURES", "OPTIONS", "FX", "CREDIT", "RATES", "COMMODITIES", "BONDS"};

    public RiskDataLoader(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadData() {
        try {
            log.info("Pre-loading risk data into Redis...");

            // Load summary
            RiskSummary summary = new RiskSummary(
                    5_000_000d + random.nextDouble() * 1_000_000d,
                    0.6 + random.nextDouble() * 0.3
            );
            redisTemplate.opsForValue().set(RISK_SUMMARY_KEY, objectMapper.writeValueAsString(summary));

            // Load accounts (40 records)
            List<RiskAccount> accounts = new ArrayList<>();
            for (int i = 1; i <= 40; i++) {
                String accountId = String.format("ACC-%03d", i);
                String book = BOOKS[random.nextInt(BOOKS.length)];
                double exposure = 100_000d + random.nextDouble() * 2_000_000d;
                double utilization = 0.2 + random.nextDouble() * 0.7;
                accounts.add(new RiskAccount(accountId, book, exposure, utilization));
            }
            redisTemplate.opsForValue().set(RISK_ACCOUNTS_KEY, objectMapper.writeValueAsString(accounts));

            // Load metrics (5 records)
            List<RiskMetric> metrics = new ArrayList<>();
            String[] metricTypes = {"VaR", "CVaR", "StressTest", "Leverage", "Concentration"};
            for (String type : metricTypes) {
                double value = random.nextDouble() * 1_000_000d;
                String status = random.nextDouble() > 0.7 ? "WARNING" : "OK";
                metrics.add(new RiskMetric(type, value, status));
            }
            redisTemplate.opsForValue().set(RISK_METRICS_KEY, objectMapper.writeValueAsString(metrics));

            log.info("Risk data pre-loaded successfully. Summary: 1, Accounts: {}, Metrics: {}", accounts.size(), metrics.size());
        } catch (Exception e) {
            log.error("Failed to pre-load risk data into Redis", e);
            // Continue execution - fallback to in-memory generation if Redis fails
        }
    }

    public record RiskSummary(double totalNetExposure, double maxMarginUtilization) {}
    public record RiskAccount(String accountId, String book, double exposure, double utilization) {}
    public record RiskMetric(String metricType, double value, String status) {}
}
