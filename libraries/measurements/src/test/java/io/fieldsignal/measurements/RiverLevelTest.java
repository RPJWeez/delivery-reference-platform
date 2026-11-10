package io.fieldsignal.measurements;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RiverLevelTest {
    @Test void boundariesAreExplicit() {
        assertEquals("NORMAL", RiverLevel.severity(new BigDecimal("2.999")));
        assertEquals("WATCH", RiverLevel.severity(new BigDecimal("3.0")));
        assertEquals("WATCH", RiverLevel.severity(new BigDecimal("4.499")));
        assertEquals("CRITICAL", RiverLevel.severity(new BigDecimal("4.5")));
    }

    @Test void invalidMeasurementsAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> RiverLevel.severity(new BigDecimal("-1")));
        assertThrows(IllegalArgumentException.class, () -> RiverLevel.severity(new BigDecimal("31")));
    }
}
