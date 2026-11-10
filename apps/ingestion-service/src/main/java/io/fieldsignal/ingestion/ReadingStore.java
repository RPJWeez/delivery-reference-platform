package io.fieldsignal.ingestion;

import io.fieldsignal.events.ReadingRecorded;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ReadingStore {
    private final JdbcTemplate jdbc;
    private final JsonMapper json;

    public ReadingStore(JdbcTemplate jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public record Request(UUID readingId, String stationId, BigDecimal levelMeters, Instant observedAt) {}

    @Transactional
    public ReadingRecorded record(Request request) {
        ReadingRecorded event;
        try {
            event = new ReadingRecorded(request.readingId(), ReadingRecorded.TYPE, 1,
                    request.stationId(), request.levelMeters(), request.observedAt());
            if (event.observedAt().isAfter(Instant.now().plusSeconds(60))) {
                throw new IllegalArgumentException("observation is in the future");
            }
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        String payload = json.writeValueAsString(event);
        // ON CONFLICT preserves a healthy PostgreSQL transaction under concurrent retries.
        int inserted = jdbc.update("INSERT INTO readings (id, station_id, level_meters, observed_at, payload) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
                event.eventId().toString(), event.stationId(), event.levelMeters(), java.time.OffsetDateTime.ofInstant(event.observedAt(), java.time.ZoneOffset.UTC), payload);
        if (inserted == 0) {
            String previous = jdbc.queryForObject("SELECT payload FROM readings WHERE id = ?", String.class, event.eventId().toString());
            var existing = json.readValue(previous, ReadingRecorded.class);
            if (!existing.stationId().equals(event.stationId()) || existing.levelMeters().compareTo(event.levelMeters()) != 0
                    || !existing.observedAt().equals(event.observedAt())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "reading ID already used for a different reading");
            }
            return existing;
        }
        jdbc.update("INSERT INTO outbox (id, station_id, payload) VALUES (?, ?, ?)", event.eventId().toString(), event.stationId(), payload);
        return event;
    }

    public List<ReadingRecorded> recent() {
        return jdbc.query("SELECT payload FROM readings ORDER BY observed_at DESC, id DESC LIMIT 100",
                (rs, row) -> json.readValue(rs.getString(1), ReadingRecorded.class));
    }
}
