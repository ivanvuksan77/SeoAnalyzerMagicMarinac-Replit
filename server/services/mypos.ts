import crypto from 'crypto';

function normalizePem(value?: string): string | undefined {
  if (!value) return undefined;
  let v = value.trim();
  // Handle accidental surrounding quotes from env files.
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  // Handle escaped newline style PEM values.
  v = v.replace(/\\n/g, '\n').replace(/\r/g, '');
  return v;
}

const MYPOS_SID = process.env.MYPOS_SID?.trim();
const MYPOS_WALLET_NUMBER = process.env.MYPOS_WALLET_NUMBER?.trim();
const MYPOS_PRIVATE_KEY = normalizePem(process.env.MYPOS_PRIVATE_KEY);
const MYPOS_PUBLIC_KEY = normalizePem(process.env.MYPOS_PUBLIC_KEY);
const MYPOS_KEY_INDEX = (process.env.MYPOS_KEY_INDEX || '1').trim();

const SANDBOX_URL = 'https://www.mypos.com/vmp/checkout-test';
const PRODUCTION_URL = 'https://www.mypos.com/vmp/checkout';

const USE_SANDBOX = process.env.MYPOS_PRODUCTION !== 'true';

const PRICING: Record<string, { amount: string; name: string }> = {
  basic: { amount: '19.00', name: 'Basic SEO Report (5 scans)' },
  pro: { amount: '29.00', name: 'Pro SEO Report (10 scans)' },
};

const CHECKOUT_SIGNATURE_ORDER = [
  'IPCmethod',
  'IPCVersion',
  'IPCLanguage',
  'SID',
  'WalletNumber',
  'Amount',
  'Currency',
  'OrderID',
  'URL_OK',
  'URL_Cancel',
  'URL_Notify',
  'CardTokenRequest',
  'KeyIndex',
  'PaymentParametersRequired',
  'PaymentMethod',
  'CustomerEmail',
  'CustomerFirstNames',
  'CustomerFamilyName',
  'CustomerPhone',
  'CustomerCountry',
  'CustomerCity',
  'CustomerZIPCode',
  'CustomerAddress',
  'Note',
  'CartItems',
  'Article_1',
  'Quantity_1',
  'Price_1',
  'Currency_1',
  'Amount_1',
] as const;

type CheckoutCustomerData = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  zipCode?: string;
  address?: string;
};

const maskMiddle = (value: string, head = 12, tail = 12): string => {
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
};

const keyFingerprint = (value?: string): string | null => {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
};

const extractPemHeader = (value?: string): string | null => {
  if (!value) return null;
  const firstLine = value.split('\n')[0]?.trim();
  return firstLine || null;
};

console.debug('[myPOS] env snapshot', {
  hasSid: !!MYPOS_SID,
  hasWallet: !!MYPOS_WALLET_NUMBER,
  hasPrivateKey: !!MYPOS_PRIVATE_KEY,
  hasPublicKey: !!MYPOS_PUBLIC_KEY,
  keyIndex: MYPOS_KEY_INDEX,
  sidMasked: MYPOS_SID ? maskMiddle(MYPOS_SID, 4, 3) : null,
  walletMasked: MYPOS_WALLET_NUMBER ? maskMiddle(MYPOS_WALLET_NUMBER, 3, 3) : null,
  privateKeyHeader: extractPemHeader(MYPOS_PRIVATE_KEY),
  publicKeyHeader: extractPemHeader(MYPOS_PUBLIC_KEY),
  privateKeyFingerprint: keyFingerprint(MYPOS_PRIVATE_KEY),
  publicKeyFingerprint: keyFingerprint(MYPOS_PUBLIC_KEY),
  privateKeyLength: MYPOS_PRIVATE_KEY?.length || 0,
  publicKeyLength: MYPOS_PUBLIC_KEY?.length || 0,
  useSandbox: USE_SANDBOX,
});

export function isMyPOSConfigured(): boolean {
  return !!(MYPOS_SID && MYPOS_WALLET_NUMBER && MYPOS_PRIVATE_KEY);
}

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SRW${timestamp}${suffix}`;
}

function buildMyPOSPayload(fields: Record<string, string>, orderedKeys: string[]): string {
  const joinedValues = orderedKeys
    .map((key) => fields[key])
    .filter((v): v is string => typeof v === 'string')
    .join('-');
  return Buffer.from(joinedValues, 'utf8').toString('base64');
}

function signData(fields: Record<string, string>, privateKey: string, orderedKeys: string[]): { signature: string; dataToSign: string } {
  // myPOS Checkout API signs base64(implode('-', values)).
  const dataToSign = buildMyPOSPayload(fields, orderedKeys);

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(dataToSign);
  sign.end();

  const formattedKey = privateKey.includes('-----BEGIN') ? privateKey : `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
  const dataToSignHash = crypto.createHash('sha256').update(dataToSign).digest('hex');
  console.debug('[myPOS] signing payload', {
    orderedKeys,
    fieldCount: orderedKeys.length,
    payloadMode: 'base64_dash_joined_values',
    dataToSignLength: dataToSign.length,
    dataToSignHash,
    dataToSignPreview: `${dataToSign.slice(0, 64)}...`,
    privateKeyHeader: extractPemHeader(formattedKey),
    privateKeyFingerprint: keyFingerprint(formattedKey),
  });
  try {
    const signature = sign.sign(formattedKey, 'base64');
    console.debug('[myPOS] signature generated', {
      signatureLength: signature.length,
      signaturePreview: `${signature.slice(0, 16)}...${signature.slice(-16)}`,
    });
    return { signature, dataToSign };
  } catch (error: any) {
    console.error('[myPOS] signData failed', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      privateKeyHeader: extractPemHeader(formattedKey),
      privateKeyFingerprint: keyFingerprint(formattedKey),
      privateKeyLength: formattedKey.length,
    });
    throw error;
  }
}

export function createMyPOSCheckoutForm(params: {
  sessionId: string;
  tier: 'basic' | 'pro';
  url: string;
  urlOk: string;
  urlCancel: string;
  urlNotify: string;
  customer: CheckoutCustomerData;
}): { url: string; fields: Record<string, string>; orderedFields: Array<{ key: string; value: string }> } | null {
  const requestStartedAt = new Date();
  console.debug('[myPOS] create checkout request', {
    sessionIdPreview: maskMiddle(params.sessionId, 8, 8),
    tier: params.tier,
    urlOk: params.urlOk,
    urlCancel: params.urlCancel,
    urlNotify: params.urlNotify,
    startedAtUtc: requestStartedAt.toISOString(),
    startedAtLocal: requestStartedAt.toString(),
    tzOffsetMinutes: requestStartedAt.getTimezoneOffset(),
  });
  if (!MYPOS_SID || !MYPOS_WALLET_NUMBER || !MYPOS_PRIVATE_KEY) return null;

  const product = PRICING[params.tier];
  if (!product) return null;

  const orderId = generateOrderId();
  const checkoutAttemptId = `chk_${orderId}`;

  const fields: Record<string, string> = {
    IPCmethod: 'IPCPurchase',
    IPCVersion: '1.4',
    IPCLanguage: 'EN',
    SID: MYPOS_SID,
    WalletNumber: MYPOS_WALLET_NUMBER,
    Amount: product.amount,
    Currency: 'EUR',
    OrderID: orderId,
    URL_OK: params.urlOk,
    URL_Cancel: params.urlCancel,
    URL_Notify: params.urlNotify,
    CardTokenRequest: '0',
    KeyIndex: MYPOS_KEY_INDEX,
    PaymentParametersRequired: '1',
    PaymentMethod: '1',
    CustomerEmail: params.customer.email,
    CustomerFirstNames: params.customer.firstName,
    CustomerFamilyName: params.customer.lastName,
    Note: product.name,
    CartItems: '1',
    Article_1: product.name,
    Quantity_1: '1',
    Price_1: product.amount,
    Currency_1: 'EUR',
    Amount_1: product.amount,
  };
  if (params.customer.phone) fields.CustomerPhone = params.customer.phone;
  if (params.customer.country) fields.CustomerCountry = params.customer.country;
  if (params.customer.city) fields.CustomerCity = params.customer.city;
  if (params.customer.zipCode) fields.CustomerZIPCode = params.customer.zipCode;
  if (params.customer.address) fields.CustomerAddress = params.customer.address;

  const orderedKeys = CHECKOUT_SIGNATURE_ORDER.filter((key) => typeof fields[key] === 'string');
  const fieldLengths = Object.fromEntries(
    orderedKeys.map((key) => [key, fields[key]?.length || 0])
  );
  console.debug('[myPOS] fields before signing', {
    checkoutAttemptId,
    orderedKeys,
    fieldLengths,
    orderId: fields.OrderID,
    emailDomain: params.customer.email.includes('@') ? params.customer.email.split('@')[1] : null,
  });
  const { signature, dataToSign } = signData(fields, MYPOS_PRIVATE_KEY, orderedKeys);
  fields.Signature = signature;
  const orderedFields = [
    ...orderedKeys.map((key) => ({ key, value: fields[key] })),
    { key: 'Signature', value: signature },
  ];

  // Safe diagnostics for gateway signature debugging.
  const payloadHash = crypto.createHash('sha256').update(dataToSign).digest('hex');
  console.log('[myPOS] checkout fields generated', {
    checkoutAttemptId,
    signedKeys: orderedKeys,
    urlOk: fields.URL_OK,
    urlCancel: fields.URL_Cancel,
    urlNotify: fields.URL_Notify,
    orderIdLength: fields.OrderID.length,
    signatureLength: signature.length,
    payloadHash,
    sid: fields.SID,
    walletTail: fields.WalletNumber.slice(-4),
    keyIndex: fields.KeyIndex,
    paymentParametersRequired: fields.PaymentParametersRequired,
    generatedAtUtc: new Date().toISOString(),
    generatedAtLocal: new Date().toString(),
    nodeVersion: process.version,
    signatureMode: 'docs_base64_dash_joined_values_rsa_sha256',
  });

  return {
    url: USE_SANDBOX ? SANDBOX_URL : PRODUCTION_URL,
    fields,
    orderedFields,
  };
}

export function verifyMyPOSNotification(postData: Record<string, string>): {
  ipcMethod: string;
  orderId: string;
  amount: string;
  currency: string;
  transactionRef: string;
} | null {
  if (!MYPOS_PUBLIC_KEY) {
    console.error('myPOS public key not configured — cannot verify payment notifications');
    return null;
  }

  const signature = postData.Signature;
  if (!signature) return null;

  // myPOS callback verification uses the exact posted field sequence (excluding Signature).
  const verificationKeys = Object.keys(postData).filter((key) => key !== 'Signature');
  const presentFields = verificationKeys.map((key) => ({ key, value: postData[key] ?? '' }));
  const dataToVerify = Buffer.from(
    presentFields.map((entry) => entry.value).join('-'),
    'utf8'
  ).toString('base64');
  const ipcMethod = postData.IPCmethod || '';
  const orderId = postData.OrderID || '';
  const amount = postData.Amount || '';
  const currency = postData.Currency || '';
  const transactionRef = postData.IPC_Trnref || '';
  console.debug('[myPOS] verify notification payload', {
    ipcMethod,
    responseFieldOrder: verificationKeys,
    presentKeys: presentFields.map((entry) => entry.key),
    payloadMode: 'base64_dash_joined_values',
    signatureLength: signature.length,
    dataToVerifyLength: dataToVerify.length,
    dataToVerifyHash: crypto.createHash('sha256').update(dataToVerify).digest('hex'),
    orderId,
    trnRefTail: transactionRef ? transactionRef.slice(-8) : null,
  });

  try {
    const publicKey = MYPOS_PUBLIC_KEY.includes('-----BEGIN')
      ? MYPOS_PUBLIC_KEY
      : `-----BEGIN PUBLIC KEY-----\n${MYPOS_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(dataToVerify);
    verify.end();

    const isValid = verify.verify(publicKey, signature, 'base64');
    if (!isValid) {
      console.error('myPOS notification signature verification failed');
      return null;
    }
  } catch (err) {
    console.error('myPOS signature verification error:', err);
    return null;
  }

  if (!orderId) return null;

  return {
    ipcMethod,
    orderId,
    amount,
    currency,
    transactionRef,
  };
}

export { PRICING };
