package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.model.DashboardViewModel.AccountBalance;
import com.example.riskdashboardbff.model.DashboardViewModel.Transaction;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Interface for ledger service client operations.
 * Enables easy mocking in unit tests without requiring actual HTTP calls.
 */
public interface LedgerServiceClient {
    
    /**
     * Fetches the list of account balances.
     * @return Mono containing the list of account balances, or empty list on failure
     */
    Mono<List<AccountBalance>> fetchAccountBalances();
    
    /**
     * Fetches the list of recent transactions.
     * @return Mono containing the list of recent transactions, or empty list on failure
     */
    Mono<List<Transaction>> fetchRecentTransactions();
}
