package io.fieldsignal.measurements;

import java.math.BigDecimal;

/** Demonstration thresholds, not a real flood forecasting or warning model. */
public final class RiverLevel {
    public static final BigDecimal WATCH_METERS = new BigDecimal("3.0");
    public static final BigDecimal CRITICAL_METERS = new BigDecimal("4.5");

    private RiverLevel() {}

    public static String severity(BigDecimal meters) {
        if (meters == null || meters.signum() < 0 || meters.compareTo(new BigDecimal("30")) > 0) {
            throw new IllegalArgumentException("river level must be between 0 and 30 meters");
        }
        if (meters.compareTo(CRITICAL_METERS) >= 0) return "CRITICAL";
        if (meters.compareTo(WATCH_METERS) >= 0) return "WATCH";
        return "NORMAL";
    }
}
