# Deploying SiteSnap on Hetzner Cloud VPS

Step-by-step guide to deploy this application on a Hetzner Cloud server with a custom domain like `seo.magicmarinac.hr`.

**Estimated time:** 30-45 minutes  
**Recommended plan:** CX22 (~€4.51/month) — 2 vCPU, 4 GB RAM, 40 GB SSD  
**OS:** Ubuntu 24.04

---

## Prerequisites

Before you start:

1. A [Hetzner Cloud](https://console.hetzner.cloud) account
2. Your project code in a **GitHub repository**
3. A domain with DNS access (e.g., `magicmarinac.hr`)
4. Your environment variable values ready (Firebase, myPOS, Mailchimp, Turnstile keys)
5. An SSH client (Terminal on Mac/Linux, or PuTTY on Windows)

---

## Step 1: Create a Cloud Server

1. Log in to [console.hetzner.cloud](https://console.hetzner.cloud)
2. Click **"Add Server"**
3. Configure:

| Setting | Value |
|---|---|
| **Location** | Falkenstein or Nuremberg (closest to Croatia) |
| **Image** | Ubuntu 24.04 |
| **Type** | Shared vCPU — **CX22** (2 vCPU, 4 GB RAM) |
| **Networking** | Public IPv4 (enabled), IPv6 (enabled) |
| **SSH Key** | Add your SSH public key (see Step 1a if you don't have one) |
| **Name** | `seo-analyzer-pro` |

4. Click **"Create & Buy now"**
5. Note the **IP address** shown (e.g., `116.203.xx.xx`) — you'll need it

### Step 1a: Generate an SSH Key (if you don't have one)

On your local computer, open Terminal and run:

```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

Press Enter for all prompts (default location, no passphrase is fine for now).

Then copy your public key:

```bash
# Mac
cat ~/.ssh/id_ed25519.pub | pbcopy

# Linux
cat ~/.ssh/id_ed25519.pub
```

Paste this public key into Hetzner when creating the server.

---

## Step 2: Connect to Your Server

Open Terminal and connect via SSH:

```bash
ssh root@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with the IP address from Step 1.

Type `yes` when asked about the fingerprint.

---

## Step 3: Initial Server Setup

Run these commands one by one:

### 3a. Update the system

```bash
apt update && apt upgrade -y
```

### 3b. Create a non-root user

```bash
adduser deploy
```

Set a password when prompted. Press Enter to skip the other questions.

```bash
usermod -aG sudo deploy
```

### 3c. Copy SSH key to the new user

```bash
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 3d. Test the new user (open a new terminal window)

```bash
ssh deploy@YOUR_SERVER_IP
```

If this works, continue. If not, check the SSH key was copied correctly.

---

## Step 4: Set Up the Firewall

Back on the server (as root or using `sudo`):

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Type `y` to confirm.

Verify:

```bash
ufw status
```

You should see SSH (22), HTTP (80), and HTTPS (443) allowed.

---

## Step 5: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node --version
# Should show v20.x.x

npm --version
# Should show 10.x.x
```

---

## Step 6: Install PM2 (Process Manager)

PM2 keeps your app running 24/7, restarts it if it crashes, and starts it on server boot.

```bash
sudo npm install -g pm2
```

---

## Step 7: Install nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
```

Verify it's running:

```bash
sudo systemctl status nginx
```

Visit `http://YOUR_SERVER_IP` in your browser — you should see the nginx welcome page.

---

## Step 8: Clone and Build Your App

### 8a. Switch to the deploy user

```bash
su - deploy
```

### 8b. Clone your repository

```bash
git clone https://github.com/YOUR_USERNAME/seo-analyzer-pro.git
cd seo-analyzer-pro
```

### 8c. Install dependencies

```bash
npm install
```

### 8d. Create the environment file

```bash
nano .env
```

Paste all your environment variables:

```env
NODE_ENV=production

# Admin (grants unlimited Pro access without payment — keep this secret)
ADMIN_ACCESS_CODE=your-secret-admin-code

# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# myPOS
MYPOS_SID=your_store_id
MYPOS_WALLET_NUMBER=your_wallet_number
MYPOS_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your_private_key_content
-----END RSA PRIVATE KEY-----"
MYPOS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
your_public_key_content
-----END PUBLIC KEY-----"

# Mailchimp
MAILCHIMP_API_KEY=your_api_key
MAILCHIMP_LIST_ID=your_list_id
MAILCHIMP_SERVER_PREFIX=us21

# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

**Important:** For multi-line values (RSA keys), wrap them in double quotes as shown above.

### 8e. Build the app

```bash
npm run build
```

This compiles the frontend (Vite) and prepares everything for production.

### 8f. Test that it starts

```bash
npm start
```

You should see something like: `[express] serving on port 5000`

Press `Ctrl+C` to stop it.

---

## Step 9: Start the App with PM2

```bash
cd /home/deploy/seo-analyzer-pro
pm2 start npm --name "seo-analyzer" -- start
```

Verify it's running:

```bash
pm2 status
```

You should see `seo-analyzer` with status `online`.

### Set PM2 to start on boot

```bash
pm2 save
pm2 startup
```

PM2 will print a command starting with `sudo env PATH=...` — copy and run that exact command.

### Useful PM2 commands

```bash
pm2 logs seo-analyzer        # View real-time logs
pm2 restart seo-analyzer      # Restart the app
pm2 stop seo-analyzer         # Stop the app
pm2 monit                     # Monitor CPU/memory
```

---

## Step 10: Configure nginx as Reverse Proxy

nginx will sit in front of your app, handle SSL, and forward requests to Node.js on port 5000.

### 10a. Create the nginx config

```bash
sudo nano /etc/nginx/sites-available/seo-analyzer
```

Paste this config:

```nginx
server {
    listen 80;
    server_name seo.magicmarinac.hr;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        client_max_body_size 10M;
    }
}
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

**Note:** `proxy_read_timeout 120s` is important — your scan analysis can take up to 30-60 seconds for complex sites.

### 10b. Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/seo-analyzer /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 10c. Test and reload nginx

```bash
sudo nginx -t
```

If it says `syntax is ok` and `test is successful`:

```bash
sudo systemctl reload nginx
```

---

## Step 11: Point Your Domain to the Server

### 11a. Add a DNS record

Go to your domain registrar or DNS provider and add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `seo` | `YOUR_SERVER_IP` | 300 |

For example, if your server IP is `116.203.45.67`:
- **Type:** A
- **Name:** seo
- **Value:** 116.203.45.67

### 11b. If using Cloudflare DNS

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select `magicmarinac.hr`
3. Go to **DNS** > **Records**
4. Add record:
   - **Type:** A
   - **Name:** seo
   - **IPv4 address:** YOUR_SERVER_IP
   - **Proxy status:** DNS only (grey cloud) — turn off proxy for now until SSL is set up
5. Save

### 11c. Wait for DNS propagation

This usually takes 5-15 minutes. Test it:

```bash
dig seo.magicmarinac.hr
```

Or visit `http://seo.magicmarinac.hr` — you should see your app (without HTTPS for now).

---

## Step 12: Set Up SSL (HTTPS) with Let's Encrypt

### 12a. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 12b. Get the certificate

```bash
sudo certbot --nginx -d seo.magicmarinac.hr
```

- Enter your email when asked
- Agree to terms of service
- Choose whether to share your email with EFF
- Certbot will automatically configure nginx for HTTPS and redirect HTTP to HTTPS

### 12c. Verify HTTPS

Visit `https://seo.magicmarinac.hr` — you should see your app with a padlock icon.

### 12d. Auto-renewal

Certbot sets up automatic renewal. Verify it's working:

```bash
sudo certbot renew --dry-run
```

Certificates renew automatically every 90 days — you don't need to do anything.

---

## Step 13: Update Turnstile and myPOS URLs

### Cloudflare Turnstile

1. Go to [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/turnstile)
2. Select your Turnstile widget
3. Add `seo.magicmarinac.hr` to the allowed hostnames
4. Save

### myPOS

1. In your myPOS merchant dashboard, ensure the notification URL points to:
   `https://seo.magicmarinac.hr/api/mypos-notify`
2. Success/cancel URLs are generated automatically by the app based on the request host

---

## Step 14: Set Up Automatic Deployments (Optional)

When you push code to GitHub, you'll want an easy way to deploy. Here's a simple deploy script:

### 14a. Create the deploy script

```bash
nano /home/deploy/deploy.sh
```

Paste:

```bash
#!/bin/bash
cd /home/deploy/seo-analyzer-pro
echo "Pulling latest code..."
git pull origin main
echo "Installing dependencies..."
npm install
echo "Building..."
npm run build
echo "Restarting app..."
pm2 restart seo-analyzer
echo "Deploy complete!"
```

Save and make it executable:

```bash
chmod +x /home/deploy/deploy.sh
```

### 14b. To deploy updates

Whenever you push changes to GitHub, SSH into your server and run:

```bash
/home/deploy/deploy.sh
```

### 14c. Set up GitHub Actions for auto-deploy (optional)

To automatically deploy every time you push to the `main` branch:

**1. Generate a deploy-only SSH key on your local machine:**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "github-deploy"
```

**2. Add the public key to the server:**

```bash
ssh deploy@YOUR_SERVER_IP "cat >> ~/.ssh/authorized_keys" < ~/.ssh/deploy_key.pub
```

**3. Add secrets to your GitHub repository:**

Go to your repo on GitHub > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Secret Name       | Value                                      |
|-------------------|--------------------------------------------|
| `SERVER_HOST`     | Your server IP (e.g., `116.203.xx.xx`)     |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/deploy_key` (the private key) |

**4. Create the workflow file in your repository:**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Hetzner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: /home/deploy/deploy.sh
```

Now every push to `main` will automatically pull, build, and restart the app on your server.

---

## Server Maintenance

### Keeping the system updated

Run this monthly:

```bash
sudo apt update && sudo apt upgrade -y
```

### Monitoring your app

```bash
pm2 monit                     # Live dashboard
pm2 logs seo-analyzer         # View app logs
pm2 status                    # Quick status check
```

### Checking disk space

```bash
df -h
```

### Checking memory usage

```bash
free -h
```

### Restarting the app

```bash
pm2 restart seo-analyzer
```

### Restarting nginx

```bash
sudo systemctl restart nginx
```

### Viewing nginx error logs

```bash
sudo tail -50 /var/log/nginx/error.log
```

### Set up PM2 log rotation

Prevent log files from growing indefinitely:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Install htop for system monitoring

```bash
sudo apt install -y htop
```

Then run `htop` for a live view of CPU, memory, and processes.

---

## Troubleshooting

### App doesn't start

```bash
pm2 logs seo-analyzer --lines 50
```

Check for errors. Common issues:
- Missing environment variables in `.env`
- Node.js version mismatch (need v20)
- Missing `npm run build` step

### Can't reach the site

1. Check the app is running: `pm2 status`
2. Check nginx is running: `sudo systemctl status nginx`
3. Check firewall allows traffic: `ufw status`
4. Check DNS is pointing to the right IP: `dig seo.magicmarinac.hr`

### SSL certificate issues

```bash
sudo certbot renew --dry-run
```

If renewal fails, check that port 80 is open and nginx is running.

### High memory or CPU usage

```bash
pm2 monit
htop
```

If the app uses too much memory, restart it:

```bash
pm2 restart seo-analyzer
```

### Scans timing out

Check the nginx proxy timeout. The config above sets `proxy_read_timeout 120s` which should be plenty. If you see 504 errors, increase it.

### After updating environment variables

After editing `.env`, restart the app:

```bash
pm2 restart seo-analyzer
```

Note: If you changed any `VITE_` prefixed variable, you need to rebuild:

```bash
npm run build
pm2 restart seo-analyzer
```

---

## Security Hardening (Recommended)

### Disable root SSH login

```bash
sudo nano /etc/ssh/sshd_config
```

Find and change:

```
PermitRootLogin no
PasswordAuthentication no
```

Save and restart SSH:

```bash
sudo systemctl restart sshd
```

**Warning:** Make sure you can log in as `deploy` via SSH key before doing this, or you'll lock yourself out.

### Install fail2ban (blocks brute-force attacks)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Enable automatic security updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Select "Yes" to enable.

---

## Cost Summary

| Item | Cost |
|---|---|
| Hetzner CX22 server | ~€4.51/month |
| Domain (magicmarinac.hr) | Varies by registrar |
| SSL certificate | Free (Let's Encrypt) |
| **Total** | **~€4.51/month + domain** |

---

## Quick Reference

| Task | Command |
|---|---|
| SSH into server | `ssh deploy@YOUR_SERVER_IP` |
| Deploy updates | `/home/deploy/deploy.sh` |
| View app logs | `pm2 logs seo-analyzer` |
| Restart app | `pm2 restart seo-analyzer` |
| App status | `pm2 status` |
| Restart nginx | `sudo systemctl restart nginx` |
| Renew SSL | `sudo certbot renew` |
| Edit env vars | `nano /home/deploy/seo-analyzer-pro/.env` |
| Rebuild after VITE_ changes | `cd /home/deploy/seo-analyzer-pro && npm run build && pm2 restart seo-analyzer` |
