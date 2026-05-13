import crypto from 'crypto';

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;

const localEmails: { email: string; tags: string[]; createdAt: Date }[] = [];

export function isMailchimpConfigured(): boolean {
  return !!(MAILCHIMP_API_KEY && MAILCHIMP_LIST_ID && MAILCHIMP_SERVER_PREFIX);
}

function getSubscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
}

export async function addSubscriber(email: string, tags: string[] = ['seo-analyzer']): Promise<boolean> {
  localEmails.push({ email, tags, createdAt: new Date() });

  if (!isMailchimpConfigured()) {
    console.log(`[Mailchimp] Not configured. Email stored locally: ${email}`);
    return true;
  }

  const subscriberHash = getSubscriberHash(email);
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members/${subscriberHash}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        status: 'subscribed',
      }),
    });

    if (!response.ok) {
      console.error(`[Mailchimp] Failed to add subscriber: ${response.status}`);
      return false;
    }

    console.log(`[Mailchimp] Subscriber added/updated: ${email}`);

    if (tags.length > 0) {
      const tagsUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members/${subscriberHash}/tags`;
      const tagsResponse = await fetch(tagsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
        },
        body: JSON.stringify({
          tags: tags.map(tag => ({ name: tag, status: 'active' })),
        }),
      });

      if (!tagsResponse.ok) {
        console.error(`[Mailchimp] Failed to add tags: ${tagsResponse.status}`);
      } else {
        console.log(`[Mailchimp] Tags added for ${email}: ${tags.join(', ')}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`[Mailchimp] Error:`, error);
    return false;
  }
}

export function getLocalEmails(): typeof localEmails {
  return [...localEmails];
}
