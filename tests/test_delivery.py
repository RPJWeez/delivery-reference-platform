import copy
import json
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from delivery import ROOT, affected, catalog, validate, values


class DeliveryPolicyTests(unittest.TestCase):
    def setUp(self):
        self.data = catalog()
        self.manifest = json.loads((ROOT / "releases/examples/sensing.json").read_text())

    def test_service_change_is_scoped(self):
        self.assertEqual(affected(["apps/ingestion-service/src/Change.java"], self.data)["services"], ["ingestion-service"])

    def test_shared_library_rebuilds_consumers(self):
        self.assertEqual(affected(["libraries/event-model/pom.xml"], self.data)["services"], ["incident-service", "ingestion-service"])

    def test_contract_rebuilds_consumers(self):
        self.assertEqual(affected(["contracts/events/reading-recorded/v1.json"], self.data)["services"], ["incident-service", "ingestion-service"])

    def test_documentation_does_not_build(self):
        self.assertEqual(affected(["docs/architecture.md"], self.data)["services"], [])

    def test_unknown_path_fails_safe(self):
        self.assertEqual(len(affected(["new-build-config"], self.data)["services"]), 2)

    def test_deleted_paths_are_analyzed(self):
        self.assertEqual(affected(["apps/incident-service/removed.java"], self.data)["services"], ["incident-service"])

    def test_chart_change_does_not_force_service_builds(self):
        self.assertEqual(affected(["charts/application/values.yaml"], self.data)["services"], [])

    def test_ui_change_selects_both_frontends_without_java(self):
        impact = affected(["libraries/ui/src/index.tsx"], self.data)
        self.assertEqual(impact["services"], [])
        self.assertTrue({"station-console", "operator-console"}.issubset(impact["components"]))

    def test_measurement_change_reaches_transitive_consumers(self):
        impact = affected(["libraries/measurements/pom.xml"], self.data)
        self.assertEqual(impact["services"], ["incident-service", "ingestion-service"])

    def test_frontend_health_paths_are_distinct(self):
        selected = values(self.manifest, self.data)["workloads"]
        self.assertEqual(selected["station-console"]["readinessPath"], "/healthz")
        self.assertEqual(selected["ingestion-service"]["readinessPath"], "/actuator/health/readiness")

    def test_cross_team_workload_rejected(self):
        self.manifest["workloads"]["incident-service"] = copy.deepcopy(self.manifest["workloads"]["ingestion-service"])
        with self.assertRaisesRegex(ValueError, "complete release unit"):
            validate(self.manifest, self.data)

    def test_mutable_image_rejected(self):
        self.manifest["workloads"]["ingestion-service"]["image"] = "ghcr.io/example/sensing:latest"
        with self.assertRaisesRegex(ValueError, "digest reference"):
            validate(self.manifest, self.data)

    def test_partial_release_rejected(self):
        self.manifest["workloads"] = {}
        with self.assertRaises(ValueError):
            validate(self.manifest, self.data)

    def test_namespace_escape_rejected(self):
        self.manifest["namespace"] = "response"
        with self.assertRaisesRegex(ValueError, "namespace"):
            validate(self.manifest, self.data)

    def test_values_contain_only_approved_workloads(self):
        self.assertEqual(set(values(self.manifest, self.data)["workloads"]), {"ingestion-service", "station-console"})

    def test_old_component_can_be_retained_in_new_release(self):
        self.manifest["sourceCommit"] = "1" * 40
        self.assertEqual(validate(self.manifest, self.data)["workloads"]["ingestion-service"]["sourceCommit"], "0" * 40)

    def test_path_traversal_rejected(self):
        with self.assertRaises(ValueError):
            affected(["../other"], self.data)


if __name__ == "__main__":
    unittest.main()
