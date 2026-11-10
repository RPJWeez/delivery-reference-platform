CREATE TABLE incidents (
    reading_id VARCHAR(36) PRIMARY KEY,
    station_id VARCHAR(40) NOT NULL,
    level_meters NUMERIC(8, 3) NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('WATCH', 'CRITICAL')),
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'ACKNOWLEDGED'))
);
