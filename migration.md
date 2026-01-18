# Migration Plan: Supabase Cloud → Self-Hosted Supabase

## Overview
Migrate MyaouApp from Supabase Cloud to self-hosted Supabase on your own infrastructure.

---

## Phase 1: Prepare Infrastructure

### 1.1 Choose a Server
| Provider | Recommended Spec | Cost |
|----------|------------------|------|
| Hetzner CPX31 | 4 vCPU, 8GB RAM, 160GB | ~$15/mo |
| DigitalOcean | 4 vCPU, 8GB RAM | ~$48/mo |
| AWS EC2 t3.large | 2 vCPU, 8GB RAM | ~$60/mo |

### 1.2 Install Prerequisites on Server
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Git
sudo apt install git -y
```

### 1.3 Clone Supabase Docker Setup
```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

---

## Phase 2: Configure Self-Hosted Supabase

### 2.1 Generate Secrets
```bash
# Generate JWT secret (save this!)
openssl rand -base64 32

# Generate anon key and service role key using the JWT secret
# Use: https://supabase.com/docs/guides/self-hosting#api-keys
```

### 2.2 Edit `.env` File
```env
# Core
POSTGRES_PASSWORD=<strong-password>
JWT_SECRET=<generated-jwt-secret>
ANON_KEY=<generated-anon-key>
SERVICE_ROLE_KEY=<generated-service-role-key>

# URLs (replace with your domain)
SITE_URL=https://myaou.app
API_EXTERNAL_URL=https://api.myaou.app
SUPABASE_PUBLIC_URL=https://supabase.myaou.app

# SMTP for auth emails
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
SMTP_SENDER_NAME=Myaou
SMTP_ADMIN_EMAIL=noreply@myaou.app

# OAuth - Google
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<your-google-client-id>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<your-google-client-secret>
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://supabase.myaou.app/auth/v1/callback

# OAuth - Apple
GOTRUE_EXTERNAL_APPLE_ENABLED=true
GOTRUE_EXTERNAL_APPLE_CLIENT_ID=<your-apple-client-id>
GOTRUE_EXTERNAL_APPLE_SECRET=<your-apple-secret>
GOTRUE_EXTERNAL_APPLE_REDIRECT_URI=https://supabase.myaou.app/auth/v1/callback
```

### 2.3 Start Supabase
```bash
docker compose up -d
```

---

## Phase 3: Export Data from Supabase Cloud

### 3.1 Export Database
```bash
# Get connection string from Supabase Dashboard > Settings > Database
pg_dump "postgresql://postgres:[password]@db.ttojvnwpnpuhkyjncwxn.supabase.co:5432/postgres" \
  --clean --if-exists \
  -F c -f backup.dump
```

### 3.2 Export Storage Files
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref ttojvnwpnpuhkyjncwxn

# Download storage buckets
supabase storage cp -r ss:///media ./backup/media
supabase storage cp -r ss:///profile-photos ./backup/profile-photos
```

---

## Phase 4: Import Data to Self-Hosted

### 4.1 Import Database
```bash
# Connect to self-hosted Postgres
pg_restore -h localhost -p 5432 -U postgres -d postgres \
  --clean --if-exists backup.dump
```

### 4.2 Create Storage Buckets
Access Supabase Studio at `https://supabase.myaou.app` and create:
- Bucket: `media` (public)
- Bucket: `profile-photos` (public)

### 4.3 Upload Storage Files
```bash
# Using S3-compatible API
aws s3 sync ./backup/media s3://media \
  --endpoint-url https://supabase.myaou.app/storage/v1/s3

aws s3 sync ./backup/profile-photos s3://profile-photos \
  --endpoint-url https://supabase.myaou.app/storage/v1/s3
```

---

## Phase 5: Update OAuth Providers

### 5.1 Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add authorized redirect URI:
   ```
   https://supabase.myaou.app/auth/v1/callback
   ```

### 5.2 Apple Developer Console
1. Go to [Apple Developer](https://developer.apple.com/)
2. Certificates, Identifiers & Profiles → Services IDs
3. Update Return URLs:
   ```
   https://supabase.myaou.app/auth/v1/callback
   ```

---

## Phase 6: Update Application

### 6.1 Update Environment Variables
```env
# .env.local (or Vercel environment variables)
NEXT_PUBLIC_SUPABASE_URL=https://supabase.myaou.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
NEXT_PUBLIC_APP_URL=https://myaou.app
```

### 6.2 Files That Use These Variables
No code changes needed - these files read from env vars:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/middleware.ts`
- `src/app/(auth)/actions.ts`

---

## Phase 7: DNS & Reverse Proxy

### 7.1 Set Up Nginx + SSL
```nginx
# /etc/nginx/sites-available/supabase
server {
    listen 443 ssl;
    server_name supabase.myaou.app;

    ssl_certificate /etc/letsencrypt/live/supabase.myaou.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/supabase.myaou.app/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 7.2 Get SSL Certificate
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d supabase.myaou.app
```

---

## Phase 8: Verification Checklist

| Test | Command/Action |
|------|----------------|
| Supabase Studio loads | Visit `https://supabase.myaou.app` |
| Database accessible | Check tables in Studio |
| Auth works | Test login/signup in app |
| Google OAuth | Test Google sign-in |
| Apple OAuth | Test Apple sign-in |
| Realtime works | Send a message, verify live update |
| Presence works | Check online status updates |
| Storage works | Upload a profile photo |
| Storage URLs work | View uploaded images |

---

## Rollback Plan

If migration fails, revert to Supabase Cloud:
1. Restore original `.env.local` with cloud credentials
2. Redeploy app
3. No data loss - cloud instance remains unchanged

---

## Post-Migration Tasks

- [ ] Set up automated database backups (pg_dump cron)
- [ ] Configure monitoring (Uptime Kuma, Grafana)
- [ ] Set up log aggregation
- [ ] Document new infrastructure
- [ ] Update Stripe webhook URL if needed
- [ ] Cancel Supabase Cloud subscription after 1 week stable

---

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Infrastructure setup | 1-2 hours |
| Data export | 30 min |
| Data import | 30 min |
| OAuth configuration | 30 min |
| App update & deploy | 15 min |
| Testing | 1-2 hours |
| **Total** | **4-6 hours** |
