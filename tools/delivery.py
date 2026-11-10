#!/usr/bin/env python3
"""Offline release policy. Registry/signature verification is a separate required gate."""
import argparse
import json
from pathlib import Path, PurePosixPath
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")
IMAGE = re.compile(r"^ghcr\.io/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$")
VERSION = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$")


def catalog():
    return json.loads((ROOT / "catalog/components.json").read_text())


def under(path, prefix):
    return path == prefix or path.startswith(prefix + "/")


def affected(paths, data):
    components = data["components"]
    selected = set()
    for path in paths:
        if path.startswith("/") or ".." in PurePosixPath(path).parts:
            raise ValueError("paths must be repository relative")
        matches = {name for name, c in components.items() if under(path, c["path"])}
        if matches:
            selected.update(matches)
        elif any(under(path, p) for p in data["globalBuildPaths"]):
            selected.update(components)
        elif not any(under(path, p) for p in data["nonBuildPaths"]):
            # Unknown files fail safe: never silently omit a build dependency.
            selected.update(components)
    while True:
        expanded = selected | {name for name, c in components.items()
                               if selected.intersection(c["dependencies"])}
        if selected == expanded:
            break
        selected = expanded
    return {"components": sorted(selected), "services": sorted(
        n for n in selected if components[n]["kind"] == "service")}


def validate(manifest, data):
    def require(condition, message):
        if not condition:
            raise ValueError(message)
    require(manifest.get("schemaVersion") == 1, "unsupported manifest schema")
    unit = data["releaseUnits"].get(manifest.get("releaseUnit"))
    require(unit is not None, "unknown release unit")
    require(manifest.get("owner") == unit["owner"], "owner must match release unit")
    require(manifest.get("namespace") == unit["namespace"], "namespace must match release unit")
    require(manifest.get("environment") in ("dev", "staging", "production"), "invalid environment")
    require(bool(VERSION.fullmatch(manifest.get("version", ""))), "invalid release version")
    require(bool(re.fullmatch(r"[0-9a-f]{40}", manifest.get("sourceCommit", ""))), "sourceCommit must be a full SHA")
    require(bool(DIGEST.fullmatch(manifest.get("chart", {}).get("digest", ""))), "chart requires immutable digest")
    require(bool(VERSION.fullmatch(manifest.get("chart", {}).get("version", ""))), "chart requires version")
    require(bool(DIGEST.fullmatch(manifest.get("configurationDigest", ""))), "configuration requires digest")
    workloads = manifest.get("workloads", {})
    require(set(workloads) == set(unit["components"]), "manifest must contain the complete release unit and no other workloads")
    for name, workload in workloads.items():
        require(data["components"][name]["owner"] == unit["owner"], "cross-team workload")
        require(bool(IMAGE.fullmatch(workload.get("image", ""))), "image must be a GHCR digest reference")
        require(bool(VERSION.fullmatch(workload.get("version", ""))), "workload requires version")
        require(bool(re.fullmatch(r"[0-9a-f]{40}", workload.get("sourceCommit", ""))), "workload requires sourceCommit")
    return manifest


def values(manifest, data):
    validate(manifest, data)
    return {"releaseVersion": manifest["version"], "workloads": {
        name: {"image": workload["image"], "port": 8080, "replicas": 2,
               "livenessPath": "/healthz" if data["components"][name]["kind"] == "frontend" else "/actuator/health/liveness",
               "readinessPath": "/healthz" if data["components"][name]["kind"] == "frontend" else "/actuator/health/readiness"}
        for name, workload in sorted(manifest["workloads"].items())}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    impact = sub.add_parser("affected")
    impact.add_argument("--path", action="append", default=[])
    impact.add_argument("--paths-file", type=Path)
    for command in ("validate", "values"):
        sub.add_parser(command).add_argument("manifest", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "affected":
            paths = args.path + (args.paths_file.read_text().splitlines() if args.paths_file else [])
            result = affected(paths, catalog())
        else:
            manifest = json.loads(args.manifest.read_text())
            result = values(manifest, catalog()) if args.command == "values" else validate(manifest, catalog())
        print(json.dumps(result, indent=2, sort_keys=True))
    except (ValueError, KeyError, TypeError) as error:
        print(f"release policy rejected input: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
