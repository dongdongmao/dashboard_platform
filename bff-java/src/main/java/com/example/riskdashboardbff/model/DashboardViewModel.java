package com.example.riskdashboardbff.model;

import java.util.List;

public record DashboardViewModel(
        List<RiskyAccount> topRiskyAccounts,
        SystemHealth health
) {

    public record RiskyAccount(
            String accountId,
            String book,
            double netExposure,
            double marginUtilization
    ) {}

    public record SystemHealth(
            String status,
            double avgLatencyMs,
            int downstreamHealthyCount,
            int downstreamTotalCount
    ) {}
}

