import crypto from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

function headers() {
  return {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/json",
  };
}

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  vendorFlatShare?: { subaccountCode: string; shareKobo: number };
}): Promise<{ authorizationUrl: string; accessCode: string }> {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amount,
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata ?? {},
  };

  if (params.vendorFlatShare) {
    body.split = {
      type: "flat",
      bearer_type: "subaccount",
      bearer_subaccount: params.vendorFlatShare.subaccountCode,
      subaccounts: [
        {
          subaccount: params.vendorFlatShare.subaccountCode,
          share: params.vendorFlatShare.shareKobo,
        },
      ],
    };
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!json.status) throw new Error(`Paystack init failed: ${json.message}`);

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
  };
}

export async function verifyTransaction(
  reference: string
): Promise<{ status: string; amount: number; email: string }> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey()}` } }
  );
  const json = await res.json();
  if (!json.status) throw new Error(`Paystack verify failed: ${json.message}`);
  return {
    status: json.data.status,
    amount: json.data.amount,
    email: json.data.customer.email,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (typeof signature !== "string" || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const computed = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createSubaccount(params: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  platformFeePercent: number;
  email?: string;
}): Promise<{ subaccountCode: string; accountName: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/subaccount`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      business_name: params.businessName,
      settlement_bank: params.bankCode,
      account_number: params.accountNumber,
      percentage_charge: params.platformFeePercent,
      description: params.businessName,
      primary_contact_email: params.email,
    }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(`Paystack subaccount failed: ${json.message}`);
  return {
    subaccountCode: json.data.subaccount_code,
    accountName: json.data.account_name ?? "",
  };
}

export async function resolveAccountName(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<{ accountName: string }> {
  const url = new URL(`${PAYSTACK_BASE}/bank/resolve`);
  url.searchParams.set("account_number", params.accountNumber);
  url.searchParams.set("bank_code", params.bankCode);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message ?? "Could not resolve account");
  return { accountName: json.data.account_name };
}

export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ recipientCode: string; accountName: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      type: "nuban",
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: "NGN",
    }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(`Paystack recipient failed: ${json.message}`);
  return {
    recipientCode: json.data.recipient_code,
    accountName: json.data.details?.account_name ?? "",
  };
}

export async function initiateTransfer(params: {
  recipientCode: string;
  amount: number;
  reason: string;
  reference?: string;
}): Promise<{ transferCode: string; status: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      source: "balance",
      amount: params.amount,
      recipient: params.recipientCode,
      reason: params.reason,
      ...(params.reference ? { reference: params.reference } : {}),
    }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(`Paystack transfer failed: ${json.message}`);
  return { transferCode: json.data.transfer_code, status: json.data.status };
}

export async function getBanks(): Promise<{ name: string; code: string }[]> {
  const res = await fetch(`${PAYSTACK_BASE}/bank?country=nigeria&perPage=100`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const json = await res.json();
  if (!json.status) return [];
  return json.data.map((b: { name: string; code: string }) => ({ name: b.name, code: b.code }));
}
