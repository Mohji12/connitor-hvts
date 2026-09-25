# VM Deployment Guide for Hospital Visitor Tracking System

This guide provides a complete step-by-step process to deploy the **Next.js + NestJS (Dockerized)** application on a **Google Cloud Platform (GCP) Virtual Machine (VM)**.

---

## 1. **Create & Configure GCP VM Instance**

### 1.1 Create VM Instance

1. Go to **GCP Console** → **Compute Engine** → **VM Instances**
2. Click **Create Instance**
3. Configure:
   - **Name**: `hospital-visitor-system`
   - **Region**: Choose closest to your users
   - **Machine Type**: e2-medium (2vCPU, 4GB RAM)
   - **Boot Disk**: Ubuntu 22.04 LTS
   - **Firewall**: Check both "Allow HTTP traffic" and "Allow HTTPS traffic"
4. Click **Create**

### 1.2 Connect to VM

- In VM Instances list, click **SSH** button next to your instance

---

## 2. **Install Required Tools**

Run these commands in SSH terminal:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg # Install prerequisites
sudo install -m 0755 -d /etc/apt/keyrings # Create keyrings directory

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg # Add Docker GPG key

sudo chmod a+r /etc/apt/keyrings/docker.gpg # Set permissions

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  # Add Docker repository

sudo apt update

sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin # Install Docker

sudo usermod -aG docker $USER
newgrp docker

docker --version
docker-compose --version
```

---

## 3. **Set Up SSH Key for GitHub**

### 3.1 Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "gcp-vm-deploy-key" -f ~/.ssh/deploy_key
```

- Press **Enter** three times (no passphrase)

### 3.2 Configure SSH

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/deploy_key
chmod 700 ~/.ssh
chmod 600 ~/.ssh/deploy_key
chmod 644 ~/.ssh/deploy_key.pub
```

### 3.3 Create SSH Config

```bash
nano ~/.ssh/config
```

Add this content:

```
Host github.com
    HostName github.com
    IdentityFile ~/.ssh/deploy_key
    User git
```

Save with **Ctrl+O**, **Enter**, **Ctrl+X**

### 3.4 Get Public Key

```bash
cat ~/.ssh/deploy_key.pub
```

**Copy the entire output** - you'll need this for GitHub.

### 3.5 Add to GitHub

1. Go to your GitHub repository
2. **Settings** → **Deploy Keys** → **Add deploy key**
3. **Title**: `GCP VM Deploy Key`
4. **Key**: Paste the copied public key
5. Don't check **✓** Allow write access
6. Click **Add key**

### 3.6 Test Connection

```bash
ssh -T git@github.com
```

You should see success message.

---

## 4. **Clone Repository**

```bash
git clone git@github.com:YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
cd YOUR_REPOSITORY_NAME
```

**Replace** with your actual GitHub username and repository name.

---

## 5. **Set Up Google Cloud SQL SSL Certificates**

### 5.1 Navigate to Backend Folder

```bash
cd backend
```

### 5.2 Download SSL Certificates

```bash
gcloud secrets versions access latest --secret="dev-cloud-sql-server-ca" > server-ca.pem
gcloud secrets versions access latest --secret="dev-cloud-sql-client-cert" > client-cert.pem
gcloud secrets versions access latest --secret="dev-cloud-sql-client-key" > client-key.pem
gcloud secrets versions access latest --secret="dev-google-credentials-json" > google-credentials.json
```

### 5.3 Set Proper Permissions

```bash
chmod 600 server-ca.pem client-cert.pem client-key.pem google-credentials.json
```

### 5.4 Verify Certificates

```bash
ls -la *.pem
```

You should see three .pem files with proper permissions.

### 5.5 Return to Project Root

```bash
cd ..
```

---

## 6. **Configure Environment**

### 6.1 Create Environment File

```bash
cp .env.example .env
nano .env
```

### 6.2 Configure Production Values

Replace with your actual values with your own .env file:

```env
# Database Configuration
DATABASE_URL="mysql://<root>:<password>@<IP>/<database-name>?sslmode=verify-ca&sslcert=../client-cert.pem&sslkey=../client-key.pem&sslca=../server-ca.pem"

# Backend Configuration
JWT_SECRET=this_is_a_super_secret_key
JWT_EXPIRES_IN=1d

# URLs
VISITOR_FORM_URL=http://<VM-IP>/public-qr-visitor-form/
NEXT_PUBLIC_BACKEND_API_URL=http://<VM-IP>/api

# Google Cloud Platform Configuration
GCP_PROJECT_ID=client-hvts
GCP_BUCKET_NAME=hvts-dev
GOOGLE_APPLICATION_CREDENTIALS=google-credentials.json

# Development Configuration
WATCHPACK_POLLING=true


# AWS SNS Configuration
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
```

**Replace** `YOUR_VM_IP` with your VM's external IP address.

Save with **Ctrl+O**, **Enter**, **Ctrl+X**.

---

## 7. **Deploy Application**

### 7.1 Build Containers

```bash
docker-compose up --build
```

(This may take 5-10 minutes)

### 7.2 Start Services

```bash
docker-compose up -d
```

### 7.3 Verify Deployment

```bash
docker ps
```

You should see your containers running.

---

## 8. **Verify Application**

### 8.1 Check Backend API

```bash
curl http://<VM-IP>/api
```

### 8.2 Check in Browser

- Backend API: `http://<VM-IP>/api`
- Swagger Docs: `http://<VM-IP>/api/docs`
- Frontend: `http://<VM-IP>`

Replace `YOUR_VM_IP` with your actual VM IP address.

---

## 9. **Essential Management Commands**

```bash
# Stop all services
docker-compose down

# View logs
docker-compose logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart
docker-compose restart backend

# Rebuild and deploy
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check status
docker-compose ps
```

---

## 10. **Troubleshooting**

### Issue: Permission denied when cloning

```bash
ssh-add -l
ssh-add ~/.ssh/deploy_key
ssh -T git@github.com
```

### Issue: Application not accessible

1. Check GCP firewall rules
2. Verify ports are open in VM settings
3. Check logs: `docker-compose logs`

### Issue: Database connection errors

1. Verify database is running
2. Check connection string in `.env`
3. Ensure SSL certificates are properly configured
4. Check database IP whitelisting

---

## 11. **Security Checklist**

- ✅ Never commit `.env` files to Git
- ✅ Never commit SSL certificate files to Git
- ✅ Use strong passwords and secrets
- ✅ Regular system updates: `sudo apt update && sudo apt upgrade`
- ✅ Configure GCP firewall properly
- ✅ SSL certificates have proper permissions (600)
- ✅ Regular backups

---

## Deployment Complete! 🎉

Your Hospital Visitor Tracking System is now running on GCP VM with secure Cloud SQL database connection.

**Next Steps:**

- Test all application features including database operations
- Configure domain name and SSL
- Set up automated backups
- Monitor application performance
- Set up certificate renewal reminders

---
