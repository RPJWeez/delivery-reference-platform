#!/usr/bin/env python3
"""Submit synthetic observations; stdlib only. Retried deliveries retain the reading ID."""
import argparse
from datetime import datetime, timezone
import json
import random
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:8081")
    parser.add_argument("--count", type=int, default=9)
    parser.add_argument("--interval", type=float, default=1)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if args.count < 1 or args.interval < 0:
        parser.error("count must be positive and interval nonnegative")
    rng = random.Random(args.seed)
    for i in range(args.count):
        reading = {"readingId": str(uuid.uuid4()), "stationId": ["cedar-01", "willow-02", "stone-03"][i % 3],
                   "levelMeters": round(rng.uniform(1.2, 5.5), 3), "observedAt": datetime.now(timezone.utc).isoformat()}
        for attempt in range(3):
            try:
                request = Request(args.url.rstrip("/") + "/api/readings", data=json.dumps(reading).encode(),
                                  headers={"Content-Type": "application/json"}, method="POST")
                with urlopen(request, timeout=10) as response:
                    print(json.dumps({"status": response.status, **reading}))
                break
            except HTTPError as error:
                if error.code < 500 or attempt == 2:
                    raise
                time.sleep(1)
            except URLError:
                if attempt == 2:
                    raise
                time.sleep(1)
        if i + 1 < args.count:
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
