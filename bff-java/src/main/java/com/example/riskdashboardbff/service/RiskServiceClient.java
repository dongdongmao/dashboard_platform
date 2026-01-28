package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.RiskSummary;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskAccount;
import com.example.riskdashboardbff.model.DashboardViewModel.RiskMetric;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Interface for risk service client operations.
 * Enables easy mocking in unit tests without requiring actual HTTP calls.
 */
public interface RiskServiceClient {
    
    /**
     * Fetches the risk summary from the risk service.
     * @return Mono containing the risk summary, or a default value on failure
     */
    Mono<RiskSummary> fetchRiskSummary();
    
    /**
     * Fetches the list of risk accounts.
     * @return Mono containing the list of risk accounts, or empty list on failure
     */
    Mono<List<RiskAccount>> fetchRiskAccounts();
    
    /**
     * Fetches the list of risk metrics.
     * @return Mono containing the list of risk metrics, or empty list on failure
     */
    Mono<List<RiskMetric>> fetchRiskMetrics();
}
