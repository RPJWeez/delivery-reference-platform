package io.fieldsignal.ingestion;

import io.fieldsignal.events.ReadingRecorded;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.concurrent.TimeUnit;

@Component
@ConditionalOnProperty(name = "fieldsignal.outbox.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxPublisher {
    private final JdbcTemplate jdbc;
    private final KafkaTemplate<String, String> kafka;

    public OutboxPublisher(JdbcTemplate jdbc, KafkaTemplate<String, String> kafka) {
        this.jdbc = jdbc;
        this.kafka = kafka;
    }

    @Scheduled(fixedDelayString = "${fieldsignal.outbox.interval-ms:1000}")
    @Transactional
    public void publish() throws Exception {
        // Row locks permit multiple publishers. A crash after send but before commit can
        // duplicate an event, so consumers must remain idempotent.
        var pending = jdbc.queryForList("SELECT id, station_id, payload FROM outbox WHERE published = false ORDER BY created_at, id LIMIT 50 FOR UPDATE SKIP LOCKED");
        for (var row : pending) {
            kafka.send(ReadingRecorded.TOPIC, (String) row.get("station_id"), (String) row.get("payload")).get(10, TimeUnit.SECONDS);
            jdbc.update("UPDATE outbox SET published = true WHERE id = ?", row.get("id"));
        }
    }
}
