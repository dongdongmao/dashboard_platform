package com.example.mocktrading;

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
 * Pre-loads mock trading data into Redis on application startup.
 */
@Component
public class TradingDataLoader {

    private static final Logger log = LoggerFactory.getLogger(TradingDataLoader.class);
    private static final String TRADING_SUMMARY_KEY = "trading:summary";
    private static final String TRADING_ORDERS_KEY = "trading:orders";
    private static final String TRADING_FILLS_KEY = "trading:fills";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();
    private static final String[] SYMBOLS = {"AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA", "META", "NFLX"};
    private static final String[] SIDES = {"BUY", "SELL"};

    public TradingDataLoader(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadData() {
        try {
            log.info("Pre-loading trading data into Redis...");

            // Load summary
            TradingSummary summary = new TradingSummary(
                    50 + random.nextInt(50),
                    500 + random.nextInt(500),
                    -50_000d + random.nextDouble() * 150_000d
            );
            redisTemplate.opsForValue().set(TRADING_SUMMARY_KEY, objectMapper.writeValueAsString(summary));

            // Load orders (30-50 records)
            List<TradingOrder> orders = new ArrayList<>();
            int orderCount = 30 + random.nextInt(20);
            for (int i = 1; i <= orderCount; i++) {
                String orderId = "ORD-" + String.format("%06d", i);
                String symbol = SYMBOLS[random.nextInt(SYMBOLS.length)];
                String side = SIDES[random.nextInt(SIDES.length)];
                int quantity = 100 + random.nextInt(900);
                double price = 100d + random.nextDouble() * 200d;
                String status = random.nextDouble() > 0.3 ? "PENDING" : "PARTIAL";
                orders.add(new TradingOrder(orderId, symbol, side, quantity, price, status));
            }
            redisTemplate.opsForValue().set(TRADING_ORDERS_KEY, objectMapper.writeValueAsString(orders));

            // Load fills (50-100 records)
            List<TradingFill> fills = new ArrayList<>();
            int fillCount = 50 + random.nextInt(50);
            for (int i = 1; i <= fillCount; i++) {
                String fillId = "FILL-" + String.format("%06d", i);
                String symbol = SYMBOLS[random.nextInt(SYMBOLS.length)];
                String side = SIDES[random.nextInt(SIDES.length)];
                int quantity = 50 + random.nextInt(450);
                double price = 100d + random.nextDouble() * 200d;
                double pnl = -5_000d + random.nextDouble() * 10_000d;
                fills.add(new TradingFill(fillId, symbol, side, quantity, price, pnl));
            }
            redisTemplate.opsForValue().set(TRADING_FILLS_KEY, objectMapper.writeValueAsString(fills));

            log.info("Trading data pre-loaded successfully. Summary: 1, Orders: {}, Fills: {}", orders.size(), fills.size());
        } catch (Exception e) {
            log.error("Failed to pre-load trading data into Redis", e);
        }
    }

    public record TradingSummary(long openOrders, long filledToday, double realizedPnl) {}
    public record TradingOrder(String orderId, String symbol, String side, int quantity, double price, String status) {}
    public record TradingFill(String fillId, String symbol, String side, int quantity, double price, double pnl) {}
}
