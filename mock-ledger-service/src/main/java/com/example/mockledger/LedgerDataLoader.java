package com.example.mockledger;

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
 * Pre-loads mock ledger data into Redis on application startup.
 */
@Component
public class LedgerDataLoader {

    private static final Logger log = LoggerFactory.getLogger(LedgerDataLoader.class);
    private static final String LEDGER_SUMMARY_KEY = "ledger:summary";
    private static final String LEDGER_BALANCES_KEY = "ledger:balances";
    private static final String LEDGER_TRANSACTIONS_KEY = "ledger:transactions";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();
    private static final String[] CURRENCIES = {"USD", "EUR", "GBP", "JPY", "CNY"};

    public LedgerDataLoader(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadData() {
        try {
            log.info("Pre-loading ledger data into Redis...");

            // Load summary
            LedgerSummary summary = new LedgerSummary(
                    -200_000d + random.nextDouble() * 400_000d,
                    1_000_000d + random.nextDouble() * 500_000d
            );
            redisTemplate.opsForValue().set(LEDGER_SUMMARY_KEY, objectMapper.writeValueAsString(summary));

            // Load balances (35 records)
            List<AccountBalance> balances = new ArrayList<>();
            for (int i = 1; i <= 35; i++) {
                String accountId = String.format("ACC-%03d", i);
                String currency = CURRENCIES[random.nextInt(CURRENCIES.length)];
                double cashBalance = -500_000d + random.nextDouble() * 1_500_000d;
                double marginUsed = 100_000d + random.nextDouble() * 800_000d;
                double availableMargin = 200_000d + random.nextDouble() * 1_000_000d;
                balances.add(new AccountBalance(accountId, currency, cashBalance, marginUsed, availableMargin));
            }
            redisTemplate.opsForValue().set(LEDGER_BALANCES_KEY, objectMapper.writeValueAsString(balances));

            // Load transactions (60-100 records)
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
            redisTemplate.opsForValue().set(LEDGER_TRANSACTIONS_KEY, objectMapper.writeValueAsString(transactions));

            log.info("Ledger data pre-loaded successfully. Summary: 1, Balances: {}, Transactions: {}", balances.size(), transactions.size());
        } catch (Exception e) {
            log.error("Failed to pre-load ledger data into Redis", e);
        }
    }

    public record LedgerSummary(double unsettledCash, double marginBalance) {}
    public record AccountBalance(String accountId, String currency, double cashBalance, double marginUsed, double availableMargin) {}
    public record Transaction(String transactionId, String accountId, String transactionType, String currency, double amount, String status) {}
}
