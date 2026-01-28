package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.TradingSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingOrder;
import com.example.riskdashboardbff.model.DashboardViewModel.TradingFill;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Interface for trading service client operations.
 * Enables easy mocking in unit tests without requiring actual HTTP calls.
 */
public interface TradingServiceClient {
    
    /**
     * Fetches the trading summary from the trading service.
     * @return Mono containing the trading summary, or a default value on failure
     */
    Mono<TradingSummary> fetchTradingSummary();
    
    /**
     * Fetches the list of open orders.
     * @return Mono containing the list of open orders, or empty list on failure
     */
    Mono<List<TradingOrder>> fetchOpenOrders();
    
    /**
     * Fetches the list of recent fills.
     * @return Mono containing the list of recent fills, or empty list on failure
     */
    Mono<List<TradingFill>> fetchRecentFills();
}
