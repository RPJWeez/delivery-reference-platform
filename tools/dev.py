#!/usr/bin/env python3
"""Run the built local slice and clean up only this launcher's child processes."""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def main():
    java = str(Path(os.environ["JAVA_HOME"]) / "bin/java") if os.environ.get("JAVA_HOME") else shutil.which("java")
    npm = shutil.which("npm")
    jars = [ROOT / f"apps/{name}/target/{name}.jar" for name in ("ingestion-service", "incident-service")]
    if not java or not npm or not all(p.is_file() for p in jars) or not (ROOT / "libraries/ui/dist/index.js").is_file():
        sys.exit("Install Java 21/Node and run npm ci && make build first.")
    children = []

    def stop(signum, frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    try:
        for command in ([java, "-jar", str(jars[0])], [java, "-jar", str(jars[1])],
                        [npm, "run", "dev:stations"], [npm, "run", "dev:operations"]):
            children.append(subprocess.Popen(command, cwd=ROOT, start_new_session=True))
        print("Stations: http://127.0.0.1:5173 | Operations: http://127.0.0.1:5174", flush=True)
        while True:
            if any(child.poll() is not None for child in children):
                raise RuntimeError("A child exited. Check logs above and port conflicts.")
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        for child in children:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()


if __name__ == "__main__":
    main()
