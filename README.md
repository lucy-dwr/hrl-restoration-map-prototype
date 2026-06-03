# hrl-restoration-map-prototype
Prototype interactive map for visualizing Healthy Rivers and Landscapes restoration projects

> **Development disclaimer**
>
> This application is an in-development prototype. It is not an authoritative
> State of California product, official public record, regulatory filing, or
> source of legal or policy guidance. Data, design, terminology, and behavior may
> change as the Healthy Rivers and Landscapes dashboard and supporting data
> workflows mature.

This repo is currently a local prototype. Azure hosting and the production HRL data-serving infrastructure are not set up yet.

Current data workflow:

1. Keep the source GeoPackage in `data/source/`.
2. Validate and normalize it against the vendored LinkML `RestorationProjectSubmission` schema in `schemas/hrl/linkml/`.
3. Convert it into browser-readable static data, starting with GeoJSON in `public/data/`.
4. Run the app locally with Vite.
