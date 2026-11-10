-- Local-only credentials. Production uses per-service secret references and roles.
CREATE USER ingestion_user WITH PASSWORD 'fieldsignal-local-only';
CREATE USER incident_user WITH PASSWORD 'fieldsignal-local-only';
CREATE DATABASE ingestion OWNER ingestion_user;
CREATE DATABASE incident OWNER incident_user;
REVOKE CONNECT ON DATABASE ingestion FROM PUBLIC;
REVOKE CONNECT ON DATABASE incident FROM PUBLIC;
GRANT CONNECT ON DATABASE ingestion TO ingestion_user;
GRANT CONNECT ON DATABASE incident TO incident_user;
