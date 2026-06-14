# Deploy: Frontend (Vercel) + Backend (Render)

## 1. Backend — Render

1. Push the repo to GitHub
2. Go to https://dashboard.render.com → **New +** → **Web Service**
3. Connect your GitHub repo
4. Fill in:

   | Field | Value |
   |---|---|
   | **Name** | `housie-server` |
   | **Root Directory** | `backend` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node src/index.js` |
   | **Plan** | Free |

5. Click **Create Web Service**
6. Wait for the deploy to finish, then copy the URL (e.g. `https://housie-server.onrender.com`)

## 2. Frontend — Vercel

1. Go to https://vercel.com → **Add New** → **Project**
2. Connect your GitHub repo
3. Fill in:

   | Field | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | Vite |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. **Environment Variables** — add:

   | Key | Value |
   |---|---|
   | `VITE_SERVER_URL` | `https://housie-server.onrender.com` (your Render URL) |

5. Click **Deploy**

## 3. Verify

- Open your Vercel app URL
- Create a room — it should connect to the Render backend
- Share the link and have others join
