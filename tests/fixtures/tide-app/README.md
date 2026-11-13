# Tide portability application

An actual Python API plus worker/Job/CronJob, sharing a source module, with no Maven,
Node, Nx graph, registry-private packages, or FieldSignal component names. Build from
this directory with `docker buildx bake application --load --metadata-file metadata.json`.
Run the worker: `docker run --rm ghcr.io/harbor/tide/worker:proof python worker.py`.
The sibling tide-web is a frontend-only application with one publishable target.
The same candidate image-binding and rendered-inventory validators handle both.
This is build/runtime adapter coverage, not proof of the protected certification path.
