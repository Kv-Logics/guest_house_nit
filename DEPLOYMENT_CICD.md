# NITT Guest House — CI/CD GitHub Actions Deployment Guide

This guide explains how to set up, configure, and manage the automated CI/CD pipeline for the NITT Guest House application using a self-hosted GitHub Actions runner.

---

## 🛠️ Infrastructure Overview
- **Domain:** `rooms.nitt.edu`
- **Application Port (Host):** `9006`
- **CI/CD Mechanism:** GitHub self-hosted runner executing workflows on the RHEL server.
- **Workflow Location:** `.github/workflows/deploy.yml`

---

## 📂 Server Directory Structure
For automated CI/CD deployments, organize folders on your RHEL server as follows:
```
/www/wwwroot/rooms.nitt.edu/              ← FTP root folder
│
├── .env                              ← Server-specific secrets config (Created manually)
├── github-runner/                    ← Runner installation folder (Created manually)
│   ├── .runner                       ← Generated automatically during setup
│   ├── .credentials                  ← Generated automatically during setup
│   └── runner.log                    ← Logs from the runner service
│
└── guesthouse/                       ← Cloned automatically by runner on code push
    ├── docker-compose.yml
    ├── .env                          ← Auto-copied from parent folder by deployment script
    ├── backend/
    └── frontend/
```

---

## 🖥️ Server-Side Setup (Admin Terminal Actions)

> ℹ️ These setup commands are executed **once** by a system administrator with SSH terminal access.

### Step 1: Install GitHub Runner Binaries
Download and extract the runner software onto the server:
```bash
# Create shared runner binary folder
sudo mkdir -p /opt/github-runner-base/bin
cd /opt/github-runner-base/bin

# Download runner package (verify version on github.com/actions/runner/releases)
curl -o actions-runner.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.316.1/actions-runner-linux-x64-2.316.1.tar.gz

# Extract
tar xzf ./actions-runner.tar.gz
```

### Step 2: Retrieve the Registration Token
1. Go to your GitHub repository: `https://github.com/Kv-Logics/guest_house_nit`
2. Navigate to **Settings** → **Actions** → **Runners** → **New self-hosted runner**.
3. Copy the `--token` value from the terminal commands. *(Note: This token expires in 1 hour).*

### Step 3: Register the Runner for this Project
Execute the registration script pointing to the developer's root directory:
```bash
# Navigate to the github-runner folder
cd /www/wwwroot/rooms.nitt.edu/github-runner

# Register and set up target workspace directory
/opt/github-runner-base/bin/config.sh \
  --url https://github.com/Kv-Logics/guest_house_nit \
  --token <PASTE_TOKEN_FROM_GITHUB> \
  --name "rooms-nitt-edu-runner" \
  --work ../guesthouse \
  --runnergroup Default \
  --labels self-hosted,RHEL \
  --unattended
```

### Step 4: Configure environmental secrets (`.env`)
Create the `.env` file in the parent folder `/www/wwwroot/rooms.nitt.edu/` with essential database passwords, tokens, and cookie configurations.

---

## 🚀 How CI/CD Deploys Automatically
Once registered, start the runner listening daemon:
```bash
cd /www/wwwroot/rooms.nitt.edu/github-runner
nohup /opt/github-runner-base/bin/run.sh &
```

Every time a developer executes:
```bash
git push origin main
```
The server-hosted runner automatically catches the job, checks out the code, copies the environment configuration, builds Docker containers, and cleans up orphaned Docker images:
```
1. Code checkout to '/www/wwwroot/rooms.nitt.edu/guesthouse/'
2. Copy parent '.env' to active container root: cp ../.env .env
3. Build & start containers: sudo docker compose up --build -d
4. Prune unused images: sudo docker image prune -f
```

---

## 🛑 Managing the Runner Process

### To Stop Runner Listening (Pause Deployments)
```bash
pkill -f "rooms.nitt.edu/github-runner"
```
*(Your active website and Docker containers remain online. Only automated code pull deployments are paused).*

### To Restart or Check Runner Status
Verify on GitHub (**Settings → Actions → Runners**) to see if the runner displays as **Idle** (green) or **Offline** (red).
