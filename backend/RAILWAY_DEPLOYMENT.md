# Railway Deployment Guide

## Problem Fixed
The error `ReferenceError: File is not defined` was occurring because Node.js v18.20.5 doesn't have the `File` API required by the `undici` package (used by native fetch in Node.js).

## Solution Applied
- Updated `package.json` to require Node.js >=20.0.0
- Created `nixpacks.toml` to specify Node.js 20 for Railway builds
- Created `.nvmrc` file for version management
- Updated `railway.json` healthcheck endpoint to `/health`

## Environment Variables Required

Set these in your Railway project environment variables:

### Database
```
DATABASE_URL=your_mysql_connection_string
```

### API Configuration
```
API_BASE_URL=https://your-backend-service.railway.app
FRONTEND_ORIGIN=https://your-frontend-domain.com
PORT=5050
```

### OpenAI
```
OPENAI_API_KEY=your_openai_api_key
OPENAI_CHAT_MODEL=gpt-4-turbo (optional, defaults to gpt-4-turbo)
```

### Gmail API (if using Gmail features)
```
GMAIL_CLIENT_EMAIL=your_service_account_email
GMAIL_PRIVATE_KEY=your_service_account_key
```

### JWT Secret
```
JWT_SECRET=your_jwt_secret_key
```

## Deployment Steps

1. **Push changes to your repository**
   ```bash
   git add .
   git commit -m "Fix Node.js version for Railway deployment"
   git push
   ```

2. **Connect to Railway**
   - Go to Railway dashboard
   - Create a new project
   - Connect your GitHub repository
   - Select the `backend` directory as the root

3. **Set environment variables**
   - In Railway dashboard, go to Variables tab
   - Add all required environment variables listed above

4. **Deploy**
   - Railway will automatically detect the changes
   - Build process will use Node.js 20
   - Application will start on assigned port

5. **Verify deployment**
   - Check health endpoint: `https://your-service.railway.app/health`
   - Check API docs: `https://your-service.railway.app/api-docs`

## Frontend Configuration

After deploying the backend, update your frontend environment:

1. Create `.env.production` in frontend root:
   ```env
   VUE_APP_API_URL=https://your-backend-service.railway.app/api
   ```

2. Build the frontend:
   ```bash
   npm run build
   ```

## Health Check

The application exposes a health check endpoint at `/health` that returns:
```json
{
  "status": "ok"
}
```

## Troubleshooting

1. **If build fails**: Check that all environment variables are set correctly
2. **If start fails**: Check logs in Railway dashboard for specific error messages
3. **If API calls fail**: Verify `FRONTEND_ORIGIN` is set to your frontend URL for CORS
 prophet_trainer_desktop_beta_landing_page
