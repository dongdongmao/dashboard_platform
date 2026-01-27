package com.example.mocktrading;

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
public class TradingController {

    private static final Logger log = LoggerFactory.getLogger(TradingController.class);
    private static final String TRADING_SUMMARY_KEY = "trading:summary";
    private static final String TRADING_ORDERS_KEY = "trading:orders";
    private static final String TRADING_FILLS_KEY = "trading:fills";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();
    private static final String[] SYMBOLS = {"AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA", "META", "NFLX"};
    private static final String[] SIDES = {"BUY", "SELL"};

    public TradingController(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/api/trading/summary")
    public TradingSummary getTradingSummary() throws InterruptedException {
        // Simulate 120–220 ms latency (includes Redis read + network overhead)
        long latency = 120 + random.nextInt(101);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(TRADING_SUMMARY_KEY);
            if (json != null) {
                return objectMapper.readValue(json, TradingSummary.class);
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
        return new TradingSummary(
                50 + random.nextInt(50),
                500 + random.nextInt(500),
                -50_000d + random.nextDouble() * 150_000d
        );
    }

    @GetMapping("/api/trading/orders")
    public List<TradingOrder> getOpenOrders() throws InterruptedException {
        // Simulate 150–250 ms latency (includes Redis read + network overhead)
        long latency = 150 + random.nextInt(101);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(TRADING_ORDERS_KEY);
            if (json != null) {
                return objectMapper.readValue(json, new TypeReference<List<TradingOrder>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
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
        return orders;
    }

    @GetMapping("/api/trading/fills")
    public List<TradingFill> getRecentFills() throws InterruptedException {
        // Simulate 130–230 ms latency (includes Redis read + network overhead)
        long latency = 130 + random.nextInt(101);
        Thread.sleep(latency);

        try {
            String json = redisTemplate.opsForValue().get(TRADING_FILLS_KEY);
            if (json != null) {
                return objectMapper.readValue(json, new TypeReference<List<TradingFill>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read from Redis, falling back to in-memory generation", e);
        }

        // Fallback to in-memory generation if Redis fails
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
        return fills;
    }

    @GetMapping("/api/trading/ping")
    public void ping() throws InterruptedException {
        Thread.sleep(60);
    }

    public record TradingSummary(
            long openOrders,
            long filledToday,
            double realizedPnl
    ) {}

    public record TradingOrder(
            String orderId,
            String symbol,
            String side,
            int quantity,
            double price,
            String status
    ) {}

    public record TradingFill(
            String fillId,
            String symbol,
            String side,
            int quantity,
            double price,
            double pnl
    ) {}
}

