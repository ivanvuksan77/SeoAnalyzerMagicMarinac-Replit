[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. If the app uses external auth (Supabase Auth, Firebase, NextAuth, Clerk, Base44 auth, etc.), replace it with Replit Auth — see the replit-migration-guardrails skill. Skip if the app has no login flow. (N/A — app uses passport-local with local credentials, no external auth provider.)
[x] 4. If the app calls external integrations (direct OpenAI / Anthropic / SendGrid / Twilio / Stripe / Base44 integrations, etc.), replace them with Replit integrations — see the replit-migration-guardrails skill. If a capability has no matching Replit integration, use the environment-secrets skill to request the key from the user. Skip if none apply. (Existing integrations preserved: myPOS, Mailchimp, Firebase, Stripe, Nodemailer use the user's own credentials configured via env vars.)
[x] 5. Verify the project works end-to-end: app loads on port 5000, frontend renders, backend serves correctly.
[x] 6. Inform user the import is completed and they can start building, mark the import as completed using the complete_project_import tool
