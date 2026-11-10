package io.fieldsignal.incidents;

import io.fieldsignal.events.ReadingRecorded;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class IncidentStoreTest {
    @Autowired IncidentStore store;
    @Autowired ReadingConsumer consumer;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach void clear() { jdbc.update("DELETE FROM incidents"); }

    private ReadingRecorded reading(String level) {
        return new ReadingRecorded(UUID.randomUUID(), ReadingRecorded.TYPE, 1, "cedar-01", new BigDecimal(level), Instant.parse("2026-01-01T12:00:00Z"));
    }

    @Test void replayDoesNotDuplicateOrResetAcknowledgedIncident() {
        var event = reading("4.8");
        store.accept(event);
        assertTrue(store.acknowledge(event.eventId().toString()));
        store.accept(event);
        assertEquals(1, store.recent().size());
        assertEquals("ACKNOWLEDGED", store.recent().getFirst().status());
        assertEquals("CRITICAL", store.recent().getFirst().severity());
    }

    @Test void normalReadingDoesNotRaiseIncident() {
        store.accept(reading("1.5"));
        assertTrue(store.recent().isEmpty());
    }

    @Test void invalidEventIsRejectedBeforeDatabaseWrite() {
        assertThrows(RuntimeException.class, () -> consumer.consume("{\"schemaVersion\":99}"));
        assertTrue(store.recent().isEmpty());
    }

    @Test void unknownIncidentCannotBeAcknowledged() {
        assertFalse(store.acknowledge(UUID.randomUUID().toString()));
    }
}
