package io.fieldsignal.incidents;

import io.fieldsignal.events.ReadingRecorded;
import io.fieldsignal.measurements.RiverLevel;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class IncidentStore {
    private final JdbcTemplate jdbc;

    public IncidentStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Incident(String readingId, String stationId, BigDecimal levelMeters,
                           String severity, String observedAt, String status) {}

    @Transactional
    public void accept(ReadingRecorded event) {
        String severity = RiverLevel.severity(event.levelMeters());
        if ("NORMAL".equals(severity)) return;
        jdbc.update("INSERT INTO incidents (reading_id, station_id, level_meters, severity, observed_at, status) VALUES (?, ?, ?, ?, ?, 'OPEN') ON CONFLICT DO NOTHING",
                event.eventId().toString(), event.stationId(), event.levelMeters(), severity, java.time.OffsetDateTime.ofInstant(event.observedAt(), java.time.ZoneOffset.UTC));
    }

    public List<Incident> recent() {
        return jdbc.query("SELECT * FROM incidents ORDER BY observed_at DESC, reading_id DESC LIMIT 100",
                (rs, row) -> new Incident(rs.getString("reading_id"), rs.getString("station_id"),
                        rs.getBigDecimal("level_meters"), rs.getString("severity"), rs.getTimestamp("observed_at").toInstant().toString(), rs.getString("status")));
    }

    public boolean acknowledge(String id) {
        return jdbc.update("UPDATE incidents SET status = 'ACKNOWLEDGED' WHERE reading_id = ?", id) == 1;
    }
}
