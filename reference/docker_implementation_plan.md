# Implementation Plan: Dockerization of Full-Stack Application (LAN / Wi-Fi Access)

This plan outlines the steps to containerize the Guest House application. Crucially, the architecture is designed so that the application can be accessed by **any device connected to the same Wi-Fi network** simply by typing the host computer's IP address (e.g., `http://192.168.1.50`).

## User Review Required
> [!IMPORTANT]
> - **Databases:** We will run PostgreSQL and Redis inside Docker containers on a private Docker network. This is the simplest and most portable approach. Is this acceptable?
> - **Production Mode:** This plan creates a true production build. The frontend is compiled into static files, making it extremely fast, but it means "hot-reloading" (where code edits show up instantly) won't be active.

## Proposed Changes

---

### [NEW] Root level
We will create a `docker-compose.yml` file in the root of the project to orchestrate all the services and map ports to your host machine's Wi-Fi interface.

#### [NEW] docker-compose.yml
- Define 4 services:
  1. `db`: PostgreSQL container.
  2. `redis`: Redis container.
  3. `backend`: Node.js backend container on an internal network.
  4. `frontend`: NGINX container serving the React app and acting as a **Reverse Proxy**.
- **Port Mapping:** Map NGINX's port 80 to the host's port 80 (`"0.0.0.0:80:80"`). This is what exposes the app to the Wi-Fi network.

#### [NEW] .dockerignore
- Add `node_modules`, `.git`, `.env`, and build directories.

---

### [MODIFY] Frontend Environment & Networking
To make the app work across the Wi-Fi network, the frontend cannot hardcode `http://localhost:5000` (otherwise a phone on the Wi-Fi would try to connect to itself!). 

#### [NEW] frontend/.env.production
- Set `VITE_API_URL=/api`. By using a relative path, the React app will automatically use whatever IP address the user typed into their browser (e.g. `http://192.168.1.50/api`).

#### [NEW] frontend/nginx.conf
We will create a custom NGINX configuration that solves the networking issue seamlessly:
- **Block 1 (`location /`):** Serve the static React files. Handle SPA routing (`try_files $uri /index.html`).
- **Block 2 (`location /api/`):** Act as a Reverse Proxy. Catch any requests going to `/api/...` and internally forward them to `http://backend:5000/api/...`. This completely bypasses CORS issues and allows Wi-Fi users to talk to the backend.

#### [NEW] frontend/Dockerfile
- **Stage 1 (Build):** Install dependencies and run `npm run build` using Vite.
- **Stage 2 (Serve):** Use `nginx:alpine`, copy the custom `nginx.conf`, and copy the React static files into NGINX's public html folder. Expose port 80.

---

### [NEW] Backend Environment
#### [NEW] backend/Dockerfile
- Use `node:20-alpine`.
- Install dependencies (`npm ci --only=production`), copy source code.
- Run the server using `CMD ["npm", "start"]`.

---

## Verification Plan

### Automated/Manual Tests
- Find your host machine's IPv4 address on the Wi-Fi (e.g., `ipconfig` -> `192.168.x.x`).
- Run `docker-compose up --build -d` in the project root.
- Check `docker ps` to verify all 4 containers are running.
- Open a browser on **a different device** (like your mobile phone connected to the same Wi-Fi) and type `http://192.168.x.x`.
- Attempt to log in from the phone. The request should hit NGINX (`/api/auth/login`), which will internally proxy it to the Node.js container, authenticating you successfully.
