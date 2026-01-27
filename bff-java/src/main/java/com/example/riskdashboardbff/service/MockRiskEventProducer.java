package com.example.riskdashboardbff.service;

import com.example.riskdashboardbff.service.RiskEventConsumer.RiskEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Sends a small batch of mock risk events to Kafka on application startup.
 * This keeps the POC self-contained without needing any external producer.
 */
@Component
public class MockRiskEventProducer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MockRiskEventProducer.class);
    private static final String TOPIC = "risk.exposure.changes";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MockRiskEventProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        List<RiskEvent> events = List.of(
                new RiskEvent("ACC-001", "EQUITIES", 1_500_000.0, 0.82),
                new RiskEvent("ACC-002", "FUTURES", 1_250_000.0, 0.76),
                new RiskEvent("ACC-003", "OPTIONS", 980_000.0, 0.68),
                new RiskEvent("ACC-004", "FX", 730_000.0, 0.59),
                new RiskEvent("ACC-005", "CREDIT", 510_000.0, 0.44),
                new RiskEvent("ACC-006", "RATES", 430_000.0, 0.37)
        );

        for (RiskEvent event : events) {
            try {
                String payload = objectMapper.writeValueAsString(event);
                kafkaTemplate.send(new ProducerRecord<>(TOPIC, event.accountId(), payload));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize mock risk event {}", event, e);
            }
        }

        log.info("Published {} mock risk events to Kafka topic {}", events.size(), TOPIC);
    }
}

