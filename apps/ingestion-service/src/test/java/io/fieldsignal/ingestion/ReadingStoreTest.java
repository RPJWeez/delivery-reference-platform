package io.fieldsignal.ingestion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class ReadingStoreTest {
    @Autowired ReadingStore store;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach void clear() { jdbc.update("DELETE FROM outbox"); jdbc.update("DELETE FROM readings"); }

    private ReadingStore.Request request(UUID id, String level) {
        return new ReadingStore.Request(id, "cedar-01", new BigDecimal(level), Instant.parse("2026-01-01T12:00:00Z"));
    }

    @Test void retryCreatesOneReadingAndOneOutboxEntry() {
        var reading = request(UUID.randomUUID(), "4.8");
        store.record(reading);
        store.record(reading);
        assertEquals(1, store.recent().size());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM outbox", Integer.class));
    }

    @Test void conflictingIdDoesNotAlterPersistedReading() {
        UUID id = UUID.randomUUID();
        store.record(request(id, "4.8"));
        var error = assertThrows(ResponseStatusException.class, () -> store.record(request(id, "2.1")));
        assertEquals(409, error.getStatusCode().value());
        assertEquals(0, new BigDecimal("4.8").compareTo(store.recent().getFirst().levelMeters()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM outbox", Integer.class));
    }

    @Test void invalidReadingHasNoDatabaseSideEffects() {
        assertThrows(ResponseStatusException.class, () -> store.record(request(UUID.randomUUID(), "-1")));
        assertTrue(store.recent().isEmpty());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM outbox", Integer.class));
    }

    @Test void outboxFailureRollsBackReadingInsert() {
        // Deliberately force a write failure in the second half of the transaction.
        jdbc.execute("ALTER TABLE outbox ADD CONSTRAINT reject_station CHECK (station_id <> 'cedar-01')");
        try {
            assertThrows(RuntimeException.class, () -> store.record(request(UUID.randomUUID(), "4.8")));
            assertTrue(store.recent().isEmpty());
        } finally {
            jdbc.execute("ALTER TABLE outbox DROP CONSTRAINT reject_station");
        }
    }
}
