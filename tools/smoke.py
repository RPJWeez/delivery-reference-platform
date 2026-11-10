#!/usr/bin/env python3
"""Real HTTP → PostgreSQL/outbox → Kafka → incident projection smoke test."""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import uuid


def call(port, path, payload=None):
    request = Request(f"http://127.0.0.1:{port}{path}",
                      data=json.dumps(payload).encode() if payload is not None else None,
                      headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=10) as response:
        raw = response.read()
        return response.status, json.loads(raw) if raw else None


def wait_for(predicate, timeout=45):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(0.5)
    raise AssertionError("timed out waiting for asynchronous projection")


def main():
    reading_id = str(uuid.uuid4())
    reading = {"readingId": reading_id, "stationId": "cedar-01", "levelMeters": 4.8,
               "observedAt": datetime.now(timezone.utc).isoformat()}
    status, event = call(8081, "/api/readings", reading)
    assert status == 202
    assert call(8081, "/api/readings", reading)[0] == 202

    def incidents():
        return [i for i in call(8082, "/api/incidents")[1] if i["readingId"] == reading_id]

    projected = wait_for(incidents)
    assert len(projected) == 1 and projected[0]["severity"] == "CRITICAL"
    assert call(8082, f"/api/incidents/{reading_id}/acknowledge", {})[0] == 204
    assert incidents()[0]["status"] == "ACKNOWLEDGED"
    compose = ["docker", "compose", "-f", str(Path(__file__).resolve().parents[1] / "infra/local/compose.yaml")]
    subprocess.run(compose + ["exec", "-T", "kafka", "/opt/kafka/bin/kafka-console-producer.sh",
                   "--bootstrap-server", "kafka:19092", "--topic", "fieldsignal.reading-recorded.v1",
                   "--producer-property", "acks=all"],
                   input=json.dumps(event) + "\n", text=True, check=True, timeout=30, capture_output=True)
    # Wait for consumer group lag to reach zero, proving the replay was processed.
    def replay_drained():
        result = subprocess.run(compose + ["exec", "-T", "kafka", "/opt/kafka/bin/kafka-consumer-groups.sh",
                                "--bootstrap-server", "kafka:19092", "--group", "fieldsignal-incidents-v1", "--describe"],
                                text=True, capture_output=True, check=True, timeout=20)
        rows = [line.split() for line in result.stdout.splitlines() if "fieldsignal.reading-recorded.v1" in line]
        return len(rows) == 3 and all(row[5] == "0" or (row[3] == "-" and row[4] == "0") for row in rows)
    wait_for(replay_drained)
    assert len(incidents()) == 1 and incidents()[0]["status"] == "ACKNOWLEDGED"
    try:
        call(8081, "/api/readings", {**reading, "levelMeters": 1.0})
        raise AssertionError("conflicting reading ID unexpectedly accepted")
    except HTTPError as error:
        assert error.code == 409
    normal = {**reading, "readingId": str(uuid.uuid4()), "levelMeters": 1.0}
    assert call(8081, "/api/readings", normal)[0] == 202
    print(json.dumps({"result": "passed", "readingId": reading_id,
                      "verified": ["HTTP acceptance", "retry deduplication", "Kafka projection", "critical classification", "acknowledgment", "real Kafka replay preserves acknowledgment", "conflicting ID rejection"]}, indent=2))


if __name__ == "__main__":
    main()
