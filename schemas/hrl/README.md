# HRL Schema

This directory vendors the LinkML schema used by the local prototype data conversion workflow.

Upstream repository: `lucy-dwr/hrl-restoration-schema`

Vendored release: `v1.0.0`

Vendored file:

- `linkml/hrl_restoration_project.yaml`

For now, the prototype uses the `RestorationProjectSubmission` class as the data contract. The schema also defines `RestorationProjectCanonicalRecord`, but that class includes fields produced by the future validation/ingestion pipeline, such as program-assigned canonical fields. Do not require canonical-only fields in the prototype until that pipeline exists.

Update process:

1. Choose a tagged upstream release.
2. Replace `linkml/hrl_restoration_project.yaml` with the file from that tag.
3. Update the vendored release noted in this README.
4. Re-run any schema-derived type or validation generation scripts once they exist.

Do not hand-edit the vendored schema in this repo unless intentionally forking the schema contract.
