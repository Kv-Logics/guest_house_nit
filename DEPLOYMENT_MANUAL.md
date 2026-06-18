# NITT Guest House — Manual Deployment Guide (FileZilla + SSH)

This guide details how to manually deploy code changes, configure environment variables, and manage Docker containers on the server using FileZilla and SSH commands.

---

## 📂 Server Workspace
- **Target Folder:** `/www/wwwroot/rooms.nitt.edu/guesthouse/`
- **Application Port:** `9006`

---

## 🚀 Step-by-Step Deployment Instructions

### 📦 Step 1: Zip the Repository Code
On your local machine, compress the project directory into a ZIP archive:
- **Exclude** directories like `node_modules/`, `pgdata/`, or temporary logs to keep the ZIP archive small.

### 🚀 Step 2: Upload Files via FileZilla
1. Open **FileZilla** and configure an SFTP session to connect to your server.
   - **Host:** `rooms.nitt.edu`
   - **Port:** `22` (SFTP) or `21` (FTP)
   - Input your server credentials and connect.
2. Navigate to the root directory `/www/wwwroot/rooms.nitt.edu/`.
3. Upload the ZIP archive you created in Step 1.
4. Upload your configured `.env` file containing all server keys directly to `/www/wwwroot/rooms.nitt.edu/`.

### 🖥️ Step 3: Extract & Move Files (SSH Terminal)
1. Open a terminal on your computer and connect to the server:
   ```bash
   ssh username@rooms.nitt.edu
   ```
2. Navigate to the deployment folder:
   ```bash
   cd /www/wwwroot/rooms.nitt.edu/
   ```
3. Extract the ZIP archive (replace `archive.zip` with the uploaded file name):
   ```bash
   unzip archive.zip
   ```
4. Move the extracted folders to the main `guesthouse` directory where Docker operates:
   ```bash
   # If extracted into guest_house_nit-main:
   mv guest_house_nit-main/* ./guesthouse/
   rmdir guest_house_nit-main
   ```
5. Ensure the active `.env` file is present in the `guesthouse` directory alongside the `docker-compose.yml` file.

### 🐳 Step 4: Run Docker Operations
Navigate to the `guesthouse` directory and execute container commands:
```bash
cd /www/wwwroot/rooms.nitt.edu/guesthouse/

# 1. Build and boot up Docker containers in detached mode
sudo docker compose up --build -d

# 2. Check running container health and status
sudo docker compose ps

# 3. Clean up older/dangling Docker images to save space
sudo docker image prune -f
```

---

## 🗄️ Step 5: Database Seeding & Maintenance (First-Time Only)

### Initialize and Seed Database Tables
If deploying on a fresh setup with empty tables, run the seeding scripts inside the running backend container:
```bash
# Run database schema migrations
sudo docker compose exec backend npm run migrate

# Run default database seeder for core settings, rooms, and mock accounts
sudo docker compose exec backend npm run seed
```

### Resetting Database Volumes (Testing/Debug Only)
> ⚠️ **CAUTION:** This wipes all booking records and resets database tables.
```bash
sudo docker compose down -v
sudo docker compose up --build -d
sudo docker compose exec backend npm run seed
```

---

## 🔍 Useful Diagnostic Commands

### View Live Container Logs
```bash
# Read combined logs
sudo docker compose logs -f

# Read logs specifically from the Node.js backend
sudo docker compose logs -f backend
```

### Restart Backend Container
```bash
sudo docker compose restart backend
```
