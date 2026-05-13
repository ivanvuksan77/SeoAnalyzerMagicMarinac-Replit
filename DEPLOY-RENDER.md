# Deploying SiteSnap on Render.com

Step-by-step guide to deploy this application on Render.com with a custom domain like `seo.magicmarinac.hr`.

---

## Prerequisites

Before you start, make sure you have:

1. A [Render.com](https://render.com) account (free tier works to start)
2. Your project code pushed to a **GitHub repository** (public or private)
3. Your environment variable values ready:
   - `MYPOS_SID`, `MYPOS_WALLET_NUMBER`, `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_SERVER_PREFIX`
   - `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
4. Access to your domain's DNS settings (e.g., via your domain registrar or Cloudflare)

---

## Step 1: Push Your Code to GitHub

If your code is not already on GitHub:

1. Go to [github.com](https://github.com) and create a new repository
2. In your local terminal, run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/seo-analyzer-pro.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Create a Web Service on Render

1. Log in to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** in the top right corner
3. Select **"Web Service"**
4. Connect your GitHub account if you haven't already
5. Find and select your `seo-analyzer-pro` repository
6. Click **"Connect"**

---

## Step 3: Configure the Web Service

Fill in the following settings:

| Setting | Value |
|---|---|
| **Name** | `seo-analyzer-pro` |
| **Region** | Choose the closest to your users (e.g., Frankfurt for EU) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Start with Free, upgrade later if needed |

### Important: Node Version

Under **Environment**, add this environment variable to ensure the correct Node.js version:

| Key | Value |
|---|---|
| `NODE_VERSION` | `20` |

---

## Step 4: Add Environment Variables

Still on the service creation page, scroll to **"Environment Variables"** and add each one:

### Required for Payments (myPOS)
| Key | Value |
|---|---|
| `MYPOS_SID` | Your myPOS Store ID |
| `MYPOS_WALLET_NUMBER` | Your myPOS wallet number |
| `MYPOS_PRIVATE_KEY` | Your RSA private key (paste the full PEM content) |
| `MYPOS_PUBLIC_KEY` | The myPOS public key (paste the full PEM content) |

### Required for Database (Firebase)
| Key | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Your Firebase service account JSON (paste the entire JSON string) |

### Required for Email Marketing (Mailchimp)
| Key | Value |
|---|---|
| `MAILCHIMP_API_KEY` | Your Mailchimp API key |
| `MAILCHIMP_LIST_ID` | Your Mailchimp audience/list ID |
| `MAILCHIMP_SERVER_PREFIX` | Your Mailchimp server prefix (e.g., `us21`) |

### Required for Bot Protection (Cloudflare Turnstile)
| Key | Value |
|---|---|
| `VITE_TURNSTILE_SITE_KEY` | Your Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Your Turnstile secret key |

### Production Settings
| Key | Value |
|---|---|
| `NODE_ENV` | `production` |

**Note about RSA keys:** When pasting multi-line keys (like `MYPOS_PRIVATE_KEY`), Render handles them correctly. Paste the full key including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`.

---

## Step 5: Create the Service

1. Click **"Create Web Service"**
2. Render will start building and deploying your app
3. Wait for the build to complete (usually 2-5 minutes)
4. Once deployed, Render gives you a URL like `https://seo-analyzer-pro.onrender.com`
5. Open that URL to verify your app is running

---

## Step 6: Verify the Deployment

1. Visit your Render URL (e.g., `https://seo-analyzer-pro.onrender.com`)
2. Try running a scan on any URL
3. Check that the Turnstile widget appears (if keys are set)
4. Test the access code system (redeem an existing code)
5. Check the browser console for any errors

---

## Step 7: Set Up Your Custom Domain (seo.magicmarinac.hr)

### 7a. Add the Domain in Render

1. Go to your web service's **Settings** tab in Render
2. Scroll to **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter: `seo.magicmarinac.hr`
5. Render will show you DNS records to configure

### 7b. Configure DNS Records

Go to your domain registrar or DNS provider (e.g., Cloudflare, your .hr registrar) and add these records:

**Option A: CNAME Record (recommended for subdomains)**

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `seo` | `seo-analyzer-pro.onrender.com` | Auto |

**Note:** The CNAME value is your Render service URL without `https://`.

### 7c. If Using Cloudflare DNS

If your DNS is managed by Cloudflare:

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select your `magicmarinac.hr` domain
3. Go to **DNS** > **Records**
4. Click **"Add Record"**
5. Set:
   - **Type**: CNAME
   - **Name**: `seo`
   - **Target**: `seo-analyzer-pro.onrender.com`
   - **Proxy status**: **DNS only** (grey cloud) — important! Render needs to handle SSL
6. Click **Save**

### 7d. Wait for DNS Propagation

- DNS changes can take 5 minutes to 48 hours to propagate
- Render will automatically provision an SSL certificate once DNS is verified
- Check the status in Render's Custom Domains section — it will show a green checkmark when ready

### 7e. Verify the Custom Domain

1. Visit `https://seo.magicmarinac.hr`
2. Confirm the SSL certificate is valid (padlock icon in browser)
3. Test the full app functionality

---

## Step 8: Update Turnstile Domain (if using Cloudflare Turnstile)

After setting up your custom domain, update your Turnstile widget:

1. Go to [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/turnstile)
2. Select your Turnstile widget
3. Under **"Hostname"**, add `seo.magicmarinac.hr`
4. Save changes

---

## Step 9: Update myPOS Callback URLs

After deployment, update your myPOS notification URLs:

1. In your myPOS merchant dashboard, update the notification URL to:
   `https://seo.magicmarinac.hr/api/mypos-notify`
2. The app automatically constructs success/cancel URLs based on the request host, so those will work automatically with the custom domain

---

## Ongoing Maintenance

### Automatic Deployments

By default, Render auto-deploys when you push to the `main` branch on GitHub. To push updates:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically rebuild and deploy.

### Manual Deployments

You can also trigger a manual deploy from the Render dashboard:
1. Go to your service
2. Click **"Manual Deploy"** > **"Deploy latest commit"**

### Monitoring

- **Logs**: View real-time logs in Render dashboard under the **"Logs"** tab
- **Metrics**: Monitor CPU, memory, and bandwidth under **"Metrics"**
- **Alerts**: Set up email alerts for deploy failures or service downtime

### Important Notes

- **Free tier**: Render's free tier spins down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. For production use, upgrade to the **Starter plan** ($7/month) which keeps the service always running.
- **In-memory data**: Analysis sessions are stored in memory. If the service restarts (deploys, scale events), active sessions are lost. Access codes in Firebase are permanent and unaffected.
- **Environment variable changes**: After updating env vars in Render, the service restarts automatically — no manual redeploy needed.

---

## Troubleshooting

### Build fails
- Check the build logs in Render for specific errors
- Ensure `NODE_VERSION` is set to `20`
- Verify all environment variables are set correctly

### App loads but scans don't work
- Check that `VITE_TURNSTILE_SITE_KEY` is set (the build needs this at build time for the frontend)
- If you change any `VITE_` prefixed env var, you need to trigger a new build (redeploy)

### Custom domain shows SSL error
- Make sure Cloudflare proxy is **off** (grey cloud) for the CNAME record
- Wait for Render to provision the SSL certificate (can take a few minutes)
- Check the domain status in Render's Custom Domains section

### Payment notifications not arriving
- Update the notification URL in myPOS to use your custom domain
- Check Render logs for incoming POST requests to `/api/mypos-notify`
- Verify your RSA keys are correctly pasted in environment variables

### Firebase not connecting
- Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` contains the full JSON string (not a file path)
- Check that the Firebase project exists and Firestore is enabled
