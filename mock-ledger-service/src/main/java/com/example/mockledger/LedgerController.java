package com.example.mockledger;

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
 */
@RestController
public class LedgerController {

    private static final Logger log = LoggerFactory.getLogger(LedgerController.class);
    private static final String LEDGER_SUMMARY_KEY = "ledger:summary";
    private static final String LEDGER_BALANCES_KEY = "ledger:balances";
    private static final String LEDGER_TRANSACTIONS_KEY = "ledger:transactions";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();
    private static final String[] CURRENCIES = {"USD", "EUR", "GBP", "JPY", "CNY"};

    public LedgerController(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/api/ledger/summary")
    public LedgerSummary getLedgerSummary() throws InterruptedException {
        // Simulate 180–320 ms latency (includes Redis read + network overhead)
        long latency = 180 + random.nextInt(141);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(LEDGER_SUMMARY_KEY);
            if (json != null) {
                return objectMapper.readValue(json, LedgerSummary.class);
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
        return new LedgerSummary(
                -200_000d + random.nextDouble() * 400_000d,
                1_000_000d + random.nextDouble() * 500_000d
        );
    }

    @GetMapping("/api/ledger/balances")
    public List<AccountBalance> getAccountBalances() throws InterruptedException {
        // Simulate 200–350 ms latency (includes Redis read + network overhead)
        long latency = 200 + random.nextInt(151);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(LEDGER_BALANCES_KEY);
            if (json != null) {
                return objectMapper.readValue(json, new TypeReference<List<AccountBalance>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
        List<AccountBalance> balances = new ArrayList<>();
        for (int i = 1; i <= 35; i++) {
            String accountId = String.format("ACC-%03d", i);
            String currency = CURRENCIES[random.nextInt(CURRENCIES.length)];
            double cashBalance = -500_000d + random.nextDouble() * 1_500_000d;
            double marginUsed = 100_000d + random.nextDouble() * 800_000d;
            double availableMargin = 200_000d + random.nextDouble() * 1_000_000d;
            balances.add(new AccountBalance(accountId, currency, cashBalance, marginUsed, availableMargin));
        }
        return balances;
    }

    @GetMapping("/api/ledger/transactions")
    public List<Transaction> getRecentTransactions() throws InterruptedException {
        // Simulate 160–280 ms latency (includes Redis read + network overhead)
        long latency = 160 + random.nextInt(121);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(LEDGER_TRANSACTIONS_KEY);
            if (json != null) {
                return objectMapper.readValue(json, new TypeReference<List<Transaction>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
        List<Transaction> transactions = new ArrayList<>();
        int txCount = 60 + random.nextInt(40);
        String[] txTypes = {"TRADE", "SETTLEMENT", "MARGIN_CALL", "DIVIDEND", "FEE"};
        for (int i = 1; i <= txCount; i++) {
            String txId = "TX-" + String.format("%08d", i);
            String accountId = String.format("ACC-%03d", 1 + random.nextInt(35));
            String txType = txTypes[random.nextInt(txTypes.length)];
            String currency = CURRENCIES[random.nextInt(CURRENCIES.length)];
            double amount = -100_000d + random.nextDouble() * 200_000d;
            String status = random.nextDouble() > 0.15 ? "SETTLED" : "PENDING";
            transactions.add(new Transaction(txId, accountId, txType, currency, amount, status));
        }
        return transactions;
    }

    @GetMapping("/api/ledger/ping")
    public void ping() throws InterruptedException {
        Thread.sleep(80);
    }

    public record LedgerSummary(
            double unsettledCash,
            double marginBalance
    ) {}

    public record AccountBalance(
            String accountId,
            String currency,
            double cashBalance,
            double marginUsed,
            double availableMargin
    ) {}

    public record Transaction(
            String transactionId,
            String accountId,
            String transactionType,
            String currency,
            double amount,
            String status
    ) {}
}

