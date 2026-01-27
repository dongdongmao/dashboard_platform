package com.example.riskdashboardbff.model;

import java.util.List;

/**
 * View model returned to the SSR frontend. It intentionally aggregates data
 * from multiple (mocked) downstream services to demonstrate a WebFlux-based
 * high-concurrency BFF.
 */
public record DashboardViewModel(
        List<RiskyAccount> topRiskyAccounts,
        SystemHealth health,
        RiskSummary riskSummary,
        TradingSummary tradingSummary,
        LatencyMetrics latencyMetrics,
        List<RiskAccount> riskAccounts,
        List<RiskMetric> riskMetrics,
        List<TradingOrder> openOrders,
        List<TradingFill> recentFills,
        List<AccountBalance> accountBalances,
        List<Transaction> recentTransactions
) {

    public record RiskyAccount(
            String accountId,
            String book,
            double netExposure,
            double marginUtilization
    ) {}

    /**
     * High-level risk KPIs aggregated from a (mock) risk engine.
     */
    public record RiskSummary(
            double totalNetExposure,
            double maxMarginUtilization
    ) {}

    /**
     * Trading activity and PnL metrics from a (mock) trading service.
     */
    public record TradingSummary(
            long openOrders,
            long filledToday,
            double realizedPnl
    ) {}

    /**
     * Downstream service latency metrics to illustrate fan-out/fan-in behavior.
     */
    public record LatencyMetrics(
            double riskServiceMs,
            double tradingServiceMs,
            double ledgerServiceMs
    ) {}

    public record SystemHealth(
            String status,
            double avgLatencyMs,
            int downstreamHealthyCount,
            int downstreamTotalCount
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

