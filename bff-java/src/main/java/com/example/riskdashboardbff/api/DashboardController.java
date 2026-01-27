package com.example.riskdashboardbff.api;

import com.example.riskdashboardbff.model.DashboardViewModel;
import com.example.riskdashboardbff.service.DashboardAggregationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class DashboardController {

    private final DashboardAggregationService aggregationService;

    public DashboardController(DashboardAggregationService aggregationService) {
        this.aggregationService = aggregationService;
    }

    @GetMapping("/api/dashboard")
    public Mono<DashboardViewModel> getDashboard() {
        return aggregationService.aggregate();
    }
}

