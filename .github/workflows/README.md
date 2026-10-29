# Deployment workflows

`deploy-pages.yml` verifies the shared engine and both initial products, builds
the unified MyGita distribution, and publishes only `dist/mygita` as the GitHub
Pages artifact. Pull requests run the same build and regression gates without
deploying.

The repository's Pages source must be set to **GitHub Actions**. The custom
domain is configured separately in repository Pages settings; DNS is changed
only after the default Pages deployment has been verified.
