import { createVerify } from "node:crypto";
import { crc32 } from "node:zlib";

// PayPal webhook self-verification:
// https://developer.paypal.com/api/rest/webhooks/rest/
// Signed message: transmissionId|transmissionTime|webhookId|crc32(raw body, decimal),
// checked with SHA256 against the public key in the cert at paypal-cert-url.

export type CertFetcher = (url: string) => Promise<string>;
type Headers = Record<string, string | string[] | undefined>;

const certCache = new Map<string, string>();

/** Only https certs on paypal.com hosts. Otherwise an attacker could sign with their own cert. */
export function isPaypalCertUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "paypal.com" || url.hostname.endsWith(".paypal.com"));
  } catch {
    return false;
  }
}

export const fetchCert: CertFetcher = async (url) => {
  const cached = certCache.get(url);
  if (cached) return cached;
  // redirect: "error" so a paypal.com URL can't bounce us to another host
  const res = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error" });
  if (!res.ok) throw new Error(`PayPal cert fetch failed with ${res.status}`);
  const pem = await res.text();
  certCache.set(url, pem);
  return pem;
};

function header(headers: Headers, name: string): string | undefined {
  const value = headers[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * True only if the signature matches one of `webhookIds`.
 * Returns false for missing headers or a non-PayPal cert URL.
 * Throws if the cert can't be fetched (caller answers 500 so PayPal retries).
 */
export async function verifyPaypalSignature(opts: {
  headers: Headers;
  rawBody: Buffer;
  webhookIds: string[];
  getCert?: CertFetcher;
}): Promise<boolean> {
  const { headers, rawBody, webhookIds, getCert = fetchCert } = opts;
  const transmissionId = header(headers, "paypal-transmission-id");
  const transmissionTime = header(headers, "paypal-transmission-time");
  const signature = header(headers, "paypal-transmission-sig");
  const certUrl = header(headers, "paypal-cert-url");
  if (!transmissionId || !transmissionTime || !signature || !certUrl) return false;
  if (!isPaypalCertUrl(certUrl)) return false;

  const cert = await getCert(certUrl);
  const checksum = crc32(rawBody);
  return webhookIds.some((webhookId) => {
    try {
      return createVerify("SHA256")
        .update(`${transmissionId}|${transmissionTime}|${webhookId}|${checksum}`)
        .verify(cert, signature, "base64");
    } catch {
      return false; // malformed cert or signature
    }
  });
}
