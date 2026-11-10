CREATE TABLE readings (
    id VARCHAR(36) PRIMARY KEY,
    station_id VARCHAR(40) NOT NULL,
    level_meters NUMERIC(8, 3) NOT NULL CHECK (level_meters BETWEEN 0 AND 30),
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payload TEXT NOT NULL
);
CREATE TABLE outbox (
    id VARCHAR(36) PRIMARY KEY REFERENCES readings(id),
    station_id VARCHAR(40) NOT NULL,
    payload TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX outbox_pending ON outbox(published, created_at);
