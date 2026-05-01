# CI/CD Automation Design - Turbo Chat

## Goal
Automate the linting, testing, and deployment processes for the Turbo Chat monorepo. Ensure that the backend (Google Cloud Run) and frontend (Vercel) are updated automatically when changes are merged into the `main` branch, while maintaining code quality through automated checks on all PRs.

## Current State
- **Linting:** Manual only. Missing in CI.
- **Testing:** Configured in `.github/workflows/ci.yml` but suboptimal (redundant builds).
- **Frontend CD:** Configured in `.github/workflows/deploy-frontend.yml` to Vercel.
- **Backend CD:** `cloudbuild-api.yaml` exists but is not triggered automatically. Current deployment uses old `erion-repo` name.

## Proposed Changes

### 1. Unified CI Workflow (`.github/workflows/ci.yml`)
- Rename to `Pipeline`.
- Add a `lint` job that runs `pnpm lint` across the monorepo.
- Optimize `test-frontend` and `test-backend` jobs by using Turborepo's remote caching (if available) or local caching of `node_modules` and `.turbo` folders.
- Add a `deploy-backend` job that:
    - Runs only on `main` branch.
    - Depends on `test-backend` and `lint` jobs.
    - Triggers Google Cloud Build using `cloudbuild-api.yaml`.

### 2. Cloud Build Configuration (`cloudbuild-api.yaml`)
- Update `_IMAGE` substitution to use `turbo-chat-repo` instead of `erion-repo`.
- Ensure tags are correctly applied (`$COMMIT_SHA` and `latest`).

### 3. Frontend Deployment (`.github/workflows/deploy-frontend.yml`)
- Update to depend on the `test-frontend` job in the unified pipeline to ensure no broken code is deployed.

## Infrastructure Requirements
- **GitHub Secrets:**
    - `GCP_PROJECT_ID`: `nanobot-487408`
    - `GCP_SA_KEY`: JSON key for a Service Account with Cloud Build Editor and Cloud Run Admin roles.
    - `VERCEL_TOKEN`: Existing token for Vercel deployment.

## Verification Plan

### Automated Tests
- Push to `develop`: Verify that `lint`, `test-frontend`, and `test-backend` jobs run and pass.
- Push to `main`: Verify that all test jobs pass and then `deploy-backend` and `deploy-frontend` jobs are triggered.

### Manual Verification
- Check Google Cloud Console for the new build in Cloud Build history.
- Verify the new revision in Cloud Run is using the image from `turbo-chat-repo`.
- Access the Cloud Run URL to ensure the API is responding correctly.
