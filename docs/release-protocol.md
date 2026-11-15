# Releasing FieldSignal

1. Validate changes in a branch/PR. A dev package can be produced for separate dev CD.
2. Merge the application changes to main. This validates source without publishing.
3. Manually create a release candidate, or compose one using existing component images.
4. Deploy and test that exact candidate through the existing QA/CD process. Check API and
   event contracts, database migrations, browser behavior and the selected configuration.
   An older component is not assumed compatible merely because its image is available.
5. Review the QA result and promote the candidate with its QA run URL and release name.
   Promotion records a normal GitHub Release without changing image or chart contents.
6. Separate CD deploys the release with reviewed environment configuration and verifies
   the observed image versions and rollout health.

For recovery, select a retained compatible release and configuration. Recheck database,
API and event compatibility: rolling back artifacts does not reverse data or external
messages. Never rebuild an old release or silently substitute its component images.
See [application workflows](pipeline.md) for the Actions inputs.
