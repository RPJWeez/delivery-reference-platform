#!/usr/bin/env python3
"""Write GitHub matrix outputs from the same catalog used for local impact analysis."""
import json
import os
import subprocess
from delivery import affected, catalog

data = catalog()
base = os.environ.get("BASE_SHA", "")
head = os.environ.get("HEAD_SHA", "HEAD")
if not base or set(base) == {"0"}:
    paths = ["pom.xml"]
else:
    paths = subprocess.check_output(
        ["git", "diff", "--name-only", "--no-renames", "-z", base, head], text=True
    ).split("\0")
    paths = [path for path in paths if path]
impact = affected(paths, data)
outputs = {
    "services": json.dumps(impact["services"], separators=(",", ":")),
    "web": str(any(data["components"][name]["kind"] == "frontend" for name in impact["components"])).lower(),
}
print(json.dumps({"paths": paths, "impact": impact}, indent=2))
if os.environ.get("GITHUB_OUTPUT"):
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        for key, value in outputs.items():
            output.write(f"{key}={value}\n")
