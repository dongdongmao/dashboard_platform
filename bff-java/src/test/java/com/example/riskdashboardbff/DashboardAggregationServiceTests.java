package com.example.riskdashboardbff;

import com.example.riskdashboardbff.service.DashboardAggregationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assumptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import reactor.test.StepVerifier;

@SpringBootTest
class DashboardAggregationServiceTests {

    @Autowired
    private DashboardAggregationService service;

    @Autowired
    private ReactiveStringRedisTemplate redisTemplate;

    @Test
    void aggregateShouldReturnTopAccountsAndHealth() {
        // If Redis is not available (e.g. running tests outside docker-compose), skip this test.
        try {
            redisTemplate.delete("top:risky:accounts").block();
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "Redis is not available, skipping integration-style test.");
        }

        StepVerifier.create(service.aggregate())
                .expectNextMatches(vm -> {
                    return vm.topRiskyAccounts() != null
                            && !vm.topRiskyAccounts().isEmpty()
                            && vm.health() != null
                            && "HEALTHY".equals(vm.health().status());
                })
                .verifyComplete();
    }
}

