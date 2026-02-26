# GitHub Actions CI/CD Setup

This document explains how to set up GitHub Actions for automated CI/CD.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request:
- Lints frontend and backend
- Type checks both apps
- Runs tests
- Builds all packages
- Uploads build artifacts

### 2. Deploy Frontend (`.github/workflows/deploy-frontend.yml`)

Deploys frontend to Vercel when:
- Code is pushed to `main` branch
- Changes are in `apps/web/` or `packages/`
- Manually triggered via `workflow_dispatch`

### 3. Deploy Backend (`.github/workflows/deploy-backend.yml`)

Deploys backend to Render.com when:
- Code is pushed to `main` branch
- Changes are in `apps/api/` or `packages/`
- Manually triggered via `workflow_dispatch`

### 4. Full CI/CD Pipeline (`.github/workflows/pipeline.yml`)

Complete pipeline that:
- Builds shared packages
- Tests frontend and backend in parallel
- Deploys both apps if tests pass


## Required Secrets

### For Vercel Deployment

Add these secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

1. **`VERCEL_TOKEN`**
   - Get from: [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
   - Create a new token with full access

2. **`VERCEL_ORG_ID`**
   - Get from: Vercel Dashboard → Settings → General
   - Copy the "Team ID" or "User ID"

3. **`VERCEL_PROJECT_ID`**
   - Get from: Your Vercel project → Settings → General
   - Copy the "Project ID"

### For Render Deployment

1. **`RENDER_API_KEY`**
   - Get from: [Render Dashboard → Account Settings → API Keys](https://dashboard.render.com/account/api-keys)
   - Create a new API key

2. **`RENDER_SERVICE_ID`**
   - Get from: Your Render service → Settings → Info
   - Copy the "Service ID"

### For AI PR Review (Ollama)

1. **`OLLAMA_API_KEY`**
   - Get from: [Ollama Settings → API Keys](https://ollama.com/settings/keys)
   - Create a new API key
   - Required for automated PR code review

## Setup Instructions

### Step 1: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add each secret listed above

### Step 2: Connect Vercel (Optional)

If you prefer to use Vercel's GitHub integration instead of GitHub Actions:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your repository
3. Configure project settings
4. Vercel will auto-deploy on push

### Step 3: Connect Render (Optional)

Render can also auto-deploy from GitHub:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Render will auto-deploy on push

### Step 4: Test the Workflows

1. Push code to `main` branch
2. Go to **Actions** tab in GitHub
3. Watch workflows run
4. Check deployment status

## Workflow Triggers

### Automatic Triggers

- **Push to `main`**: Full CI/CD pipeline runs
- **Push to `develop`**: CI runs (no deployment)
- **Pull Request**: CI runs (no deployment)
- **Path changes**: Only relevant workflows run

### Manual Triggers

You can manually trigger deployments:

1. Go to **Actions** tab
2. Select workflow (e.g., "Deploy Frontend")
3. Click **"Run workflow"**
4. Select branch and click **"Run workflow"**

## Customization

### Skip Deployment

To skip automatic deployment, add `[skip deploy]` to your commit message:

```bash
git commit -m "Update docs [skip deploy]"
```

### Environment-Specific Deployments

Modify workflows to deploy to different environments:

```yaml
# Deploy to staging on develop branch
if: github.ref == 'refs/heads/develop'

# Deploy to production on main branch
if: github.ref == 'refs/heads/main'
```

### Add Notifications

Add Slack/Discord notifications:

```yaml
- name: Notify on deployment
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Troubleshooting

### Workflow Fails

1. Check **Actions** tab for error details
2. Verify all secrets are set correctly
3. Check build logs for specific errors
4. Ensure Node.js version matches (18+)

### Deployment Doesn't Trigger

1. Verify branch is `main`
2. Check if paths changed match workflow paths
3. Ensure workflow file is in `.github/workflows/`
4. Check workflow syntax is valid

### Vercel Deployment Fails

1. Verify `VERCEL_TOKEN` is valid
2. Check `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
3. Ensure project exists in Vercel
4. Check Vercel build logs

### Render Deployment Fails

1. Verify `RENDER_API_KEY` is valid
2. Check `RENDER_SERVICE_ID` is correct
3. Ensure service exists in Render
4. Check Render deployment logs

## Best Practices

1. **Use branch protection**: Require CI to pass before merging
2. **Test before deploy**: Always run tests in CI
3. **Review deployments**: Monitor deployment status
4. **Keep secrets secure**: Never commit secrets to code
5. **Use environment variables**: Store config in platform settings
6. **Monitor costs**: Track usage on Vercel/Render dashboards

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/concepts/git)
- [Render GitHub Integration](https://render.com/docs/github)
- [PNPM Workspace Documentation](https://pnpm.io/workspaces)

