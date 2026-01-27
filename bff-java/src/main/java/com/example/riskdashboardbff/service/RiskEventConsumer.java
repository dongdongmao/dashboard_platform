package com.example.riskdashboardbff.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Consumes mock risk exposure events from Kafka and updates the Redis
 * sorted set used by the dashboard aggregation service.
 *
 * Topic: risk.exposure.changes
 */
@Service
public class RiskEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(RiskEventConsumer.class);
    private static final String TOP_RISK_KEY = "top:risky:accounts";

    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RiskEventConsumer(ReactiveStringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @KafkaListener(topics = "risk.exposure.changes")
    public void handle(ConsumerRecord<String, String> record) {
        String payload = record.value();
        try {
            RiskEvent event = objectMapper.readValue(payload, RiskEvent.class);

            // Use netExposure as score in the sorted set
            Mono<Boolean> write = redisTemplate.opsForZSet()
                    .add(TOP_RISK_KEY, event.accountId(), event.netExposure());

            write.subscribe(
                    ok -> log.debug("Updated Redis ZSET for account {} with exposure {}", event.accountId(), event.netExposure()),
                    ex -> log.warn("Failed to update Redis for account {}: {}", event.accountId(), ex.getMessage())
            );
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize risk event from Kafka: {}", payload, e);
        }
    }

    /**
     * Simple DTO for mock risk events consumed from Kafka.
     */
    public record RiskEvent(
            String accountId,
            String book,
            double netExposure,
            double marginUtilization
    ) {}
}

