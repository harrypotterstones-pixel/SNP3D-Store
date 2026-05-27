SNP3D — Static storefront + optional backend

This repository contains a static storefront (`index.html`, `catalog-data.js`) and an optional Node.js backend (in `backend/`) that provides authentication, user lists, analytics, and printer integration.

Goals for deployment:
- Host the static frontend (Netlify recommended)
- Keep a GitHub Pages backup
- Host the backend separately and connect it to MongoDB Atlas

Quick steps to deploy the frontend (Netlify + GitHub backup):

1. Create a GitHub repository and push this project (root of repo is the site root).

2. Enable GitHub Pages (optional backup):
   - In repo settings > Pages, set source to `gh-pages` branch (this repo includes a GitHub Action to publish to `gh-pages` on push to `main`/`master`).

3. Deploy on Netlify (recommended):
   - Sign in to Netlify and click "Add new site" → "Import from Git" → connect your GitHub repo.
   - For the build settings: leave build command blank and set `Publish directory` to `/` (root).
   - After deploy, go to `Site settings` > `Domain management` to add your custom domain (e.g. `snp3d.ca`).
   - In Netlify > Domain settings, Netlify will show DNS records — add them at your domain registrar.

4. Configure redirects (see `netlify.toml`):
   - Update the API redirect target to your deployed backend URL.

Backend & MongoDB Atlas (overview):

1. Create a MongoDB Atlas account and create a cluster:
   - https://www.mongodb.com/cloud/atlas
   - Create a free Shared Cluster, set up a database user and whitelist your IP (or allow access from anywhere during setup).
   - Get the connection string and paste into `backend/.env` as `MONGODB_URI`.

2. Copy `backend/.env.example` to `backend/.env` and fill in all values (JWT_SECRET, SMTP_* for email service).

3. Run backend locally for testing:

```bash
cd backend
npm install
cp .env.example .env
# edit .env to add real values
npm run dev
```

4. Deploy backend to a host (Render, Railway, Heroku, or a VPS):
   - Render and Railway have straightforward Git integration and environment variable management.
   - Set `MONGODB_URI`, `JWT_SECRET`, `SMTP_*`, and `FRONTEND_URL` on your host's environment settings.

Security & Production notes:
- Use strong `JWT_SECRET` and unique admin credentials.
- Configure SMTP (SendGrid, Mailgun, or your email provider) for verification and password reset emails.
- Enable HTTPS for your custom domain (Netlify provides automatic Let's Encrypt certs).

If you want, I can:
- Prepare a polished GitHub push (commit instructions and files).
- Walk through creating a GitHub repo and pushing your repo from this folder.
- Walk through connecting your GitHub repo to Netlify and configuring DNS.
- Walk through creating a MongoDB Atlas cluster and configuring the backend `.env`.

Tell me which of the above you'd like me to do next and I will proceed.