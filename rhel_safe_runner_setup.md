# Simple GitHub Runner Setup (For RHEL Server)

This guide shows how to set up automatic deployment for your website.

---

## 👥 Roles (Who does what?)

* **Developer**: Pushes their project files to Git. The server gets it automatically.
* **Admin**: Sets up the keys once, and turns the CI/CD runner ON or OFF when requested.

---

## 📂 Folder Structure (Inside RHEL Server)

```text
/var/www/[YOUR_DOMAIN]/               # Your domain space
├── .env                              # You upload this file (contains passwords/secrets)
├── github-runner/                    # Folder for connection keys
└── [YOUR_PROJECT_NAME]/              # Folder where your code goes automatically
```

---

## 💻 Developer Steps (Using FileZilla)

1. Create a folder named `github-runner` inside your domain folder.
2. Upload your `.env` file containing database passwords/secrets into your domain folder.

---

## ⚙️ Admin Steps (Using Terminal)

### One-Time Setup (Download the runner to the server):
*Run this only once for the lifetime of the server. You do NOT need to run this for each project.*
```bash
sudo mkdir -p /opt/github-runner-base/bin
cd /opt/github-runner-base/bin
sudo curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.316.1/actions-runner-linux-x64-2.316.1.tar.gz
sudo tar xzf ./actions-runner.tar.gz
sudo chown -R $USER:$USER /opt/github-runner-base
```

### The Only 3 Commands You Need:

#### 1. Setup Keys (Run once per project):
```bash
cd /var/www/[YOUR_DOMAIN]/github-runner
/opt/github-runner-base/bin/config.sh --url https://github.com/Kv-Logics/geofence-engine --token GITHUB_RUNNER_TOKEN --work ../[YOUR_PROJECT_NAME]
```

#### 2. Turn ON (Start Deployment):
* **When to use**: Run this only when you want to deploy code updates from GitHub to your server.
* **What it does**: Connects to GitHub, downloads your code, and deploys it.
```bash
cd /var/www/[YOUR_DOMAIN]/github-runner
nohup /opt/github-runner-base/bin/run.sh &
```

#### 3. Turn OFF (Stop Deployment):
* **When to use**: Run this after your deployment finishes to close the connection to GitHub.
* **What it does**: Stops listening for new code updates. **Your website stays online and is completely unaffected.**
```bash
pkill -f "[YOUR_DOMAIN]/github-runner"
```


## 🚀 How the Deployment Works

When the Runner is **ON**, deployment happens automatically in three steps:

### 1. The Push 📤
* **Action**: Developer pushes code changes (Frontend, Backend, or Docker files) to GitHub.

### 2. The Trigger ⚡
* **Action**: GitHub signals the server runner over the open connection.
* **Server Action**: The runner fetches and downloads the new files to:
  `/var/www/[YOUR_DOMAIN]/[YOUR_PROJECT_NAME]/`

### 3. The Auto-Build 🐳
* **Action**: The runner automatically runs the Docker workflow commands:
  ```bash
  docker compose down
  docker compose up --build -d
  ```
* **Result**: Docker reads the database passwords from your safe `.env` file at `/var/www/[YOUR_DOMAIN]/.env` and boots your React/Node/PostgreSQL containers. 

*No manual command entry or SSH logins required!*


