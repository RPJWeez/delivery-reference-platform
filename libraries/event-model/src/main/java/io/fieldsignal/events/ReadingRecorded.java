package io.fieldsignal.events;

import io.fieldsignal.measurements.RiverLevel;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ReadingRecorded(UUID eventId, String eventType, int schemaVersion,
                              String stationId, BigDecimal levelMeters, Instant observedAt) {
    public static final String TOPIC = "fieldsignal.reading-recorded.v1";
    public static final String TYPE = "ReadingRecorded";

    public ReadingRecorded {
        if (eventId == null || observedAt == null || !TYPE.equals(eventType) || schemaVersion != 1) {
            throw new IllegalArgumentException("invalid ReadingRecorded v1 envelope");
        }
        if (stationId == null || !stationId.matches("[a-z0-9][a-z0-9-]{0,39}")) {
            throw new IllegalArgumentException("invalid station ID");
        }
        RiverLevel.severity(levelMeters);
        if (levelMeters.stripTrailingZeros().scale() > 3) {
            throw new IllegalArgumentException("river level supports at most three decimal places");
        }
    }
}
