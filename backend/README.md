Backend (Node.js + Express) — SNP3D

This backend provides authentication, user lists, analytics, orders, and printer integration.

Prerequisites:
- Node.js >= 16
- npm
- MongoDB (Atlas recommended)

Setup (local):

1. Install dependencies

```bash
cd backend
npm install
```

2. Configure environment

```bash
cp .env.example .env
# Edit backend/.env and set MONGODB_URI, JWT_SECRET, SMTP_* and FRONTEND_URL
```

3. Run the server in development

```bash
npm run dev
```

4. The app will try to connect to the MongoDB URI. If it fails it will fall back to an in-memory MongoDB for local development and will seed sample data.

Important environment variables (see `.env.example`):
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Secret for signing JWTs
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — Email sending credentials
- `FRONTEND_URL` — Your frontend domain

Deploying to a host:
- Use Render, Railway, or any Node host. Add environment variables in the host settings.
- Ensure port is set to `PORT` env var (default 3001).

MongoDB Atlas quick guide:
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user (username/password)
4. Network Access: add your IP address or 0.0.0.0/0 for testing
5. In "Database" > Connect, choose "Connect your application" and copy the connection string
6. Paste into `MONGODB_URI` in `.env` (replace <username>, <password>, <cluster-url>)

Once connected, the server will seed an admin user and some sample products if the DB is empty.

If you want, I can help create the MongoDB Atlas cluster and guide you through adding the values into a `.env` file.
