import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = "BKEIlKAqx1H3slXbH3GOTrxFhvqTaOqo7WqmU5vrQvYzRcv7LjjZohKMSP1lC0wBMc0-O04oaI8tTEVhcGr3LVI";

// Web Push utilities
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateVapidAuthHeader(
  endpoint: string,
  privateKeyBase64url: string,
  publicKeyBase64url: string,
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: expiry,
    sub: "mailto:konovartechtist@gmail.com",
  };

  const encoder = new TextEncoder();
  const headerB64 = arrayBufferToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = arrayBufferToBase64Url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBuffer = base64UrlToArrayBuffer(privateKeyBase64url);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    await convertRawPrivateKeyToPkcs8(privateKeyBuffer, publicKeyBase64url),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken),
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes[0] === 0x30) {
    // DER format
    const rLen = sigBytes[3];
    const rStart = 4;
    const rData = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sData = sigBytes.slice(sStart, sStart + sLen);
    r = rData.length > 32 ? rData.slice(rData.length - 32) : rData;
    s = sData.length > 32 ? sData.slice(sData.length - 32) : sData;
    if (r.length < 32) { const padded = new Uint8Array(32); padded.set(r, 32 - r.length); r = padded; }
    if (s.length < 32) { const padded = new Uint8Array(32); padded.set(s, 32 - s.length); s = padded; }
  } else {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  }
  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const jwt = `${unsignedToken}.${arrayBufferToBase64Url(rawSig.buffer)}`;

  return {
    authorization: `vapid t=${jwt}, k=${publicKeyBase64url}`,
    cryptoKey: `p256ecdsa=${publicKeyBase64url}`,
  };
}

async function convertRawPrivateKeyToPkcs8(rawPrivateKey: ArrayBuffer, publicKeyBase64url: string): Promise<ArrayBuffer> {
  const publicKeyBuffer = base64UrlToArrayBuffer(publicKeyBase64url);
  const pubBytes = new Uint8Array(publicKeyBuffer);

  // Uncompressed public key should be 65 bytes (0x04 + 32 + 32)
  const privBytes = new Uint8Array(rawPrivateKey);

  // Build PKCS8 DER structure for EC P-256
  const oidP256 = new Uint8Array([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]);
  const oidEC = new Uint8Array([0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]);

  // ECPrivateKey SEQUENCE
  const ecPrivateKey = buildDerSequence([
    buildDerInteger(new Uint8Array([1])), // version
    buildDerOctetString(privBytes),
    buildDerContextTag(1, buildDerBitString(pubBytes)),
  ]);

  // AlgorithmIdentifier SEQUENCE
  const algId = buildDerSequence([oidEC, oidP256]);

  // PKCS8 PrivateKeyInfo SEQUENCE
  const pkcs8 = buildDerSequence([
    buildDerInteger(new Uint8Array([0])), // version
    algId,
    buildDerOctetString(ecPrivateKey),
  ]);

  return pkcs8.buffer;
}

function buildDerSequence(items: Uint8Array[]): Uint8Array {
  const content = concatUint8Arrays(items);
  return wrapDer(0x30, content);
}

function buildDerInteger(value: Uint8Array): Uint8Array {
  // Add leading zero if high bit set
  if (value[0] & 0x80) {
    const padded = new Uint8Array(value.length + 1);
    padded[0] = 0;
    padded.set(value, 1);
    return wrapDer(0x02, padded);
  }
  return wrapDer(0x02, value);
}

function buildDerOctetString(data: Uint8Array): Uint8Array {
  return wrapDer(0x04, data);
}

function buildDerBitString(data: Uint8Array): Uint8Array {
  const content = new Uint8Array(data.length + 1);
  content[0] = 0; // no unused bits
  content.set(data, 1);
  return wrapDer(0x03, content);
}

function buildDerContextTag(tag: number, data: Uint8Array): Uint8Array {
  return wrapDer(0xa0 | tag, data);
}

function wrapDer(tag: number, content: Uint8Array): Uint8Array {
  const len = content.length;
  let header: Uint8Array;
  if (len < 128) {
    header = new Uint8Array([tag, len]);
  } else if (len < 256) {
    header = new Uint8Array([tag, 0x81, len]);
  } else {
    header = new Uint8Array([tag, 0x82, (len >> 8) & 0xff, len & 0xff]);
  }
  const result = new Uint8Array(header.length + content.length);
  result.set(header, 0);
  result.set(content, header.length);
  return result;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

// Web Push encryption (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string,
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  const clientPublicKey = base64UrlToArrayBuffer(p256dhBase64);
  const clientAuth = base64UrlToArrayBuffer(authBase64);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    localKeyPair.privateKey,
    256,
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive IKM from auth secret
  const authInfo = encoder.encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + clientPublicKey.byteLength + localPublicKeyRaw.byteLength);
  authInfoFull.set(authInfo, 0);
  authInfoFull.set(new Uint8Array(clientPublicKey), authInfo.length);
  authInfoFull.set(new Uint8Array(localPublicKeyRaw), authInfo.length + clientPublicKey.byteLength);

  const authKey = await crypto.subtle.importKey("raw", clientAuth, { name: "HKDF" }, false, ["deriveBits"]);
  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(sharedSecret), info: authInfoFull },
    authKey,
    256,
  );

  // Derive CEK and nonce
  const saltKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode("Content-Encoding: aes128gcm\0") },
    saltKey,
    128,
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode("Content-Encoding: nonce\0") },
    saltKey,
    96,
  );

  // Pad payload (add delimiter byte 0x02)
  const padded = new Uint8Array(payloadBytes.length + 1);
  padded.set(payloadBytes);
  padded[payloadBytes.length] = 2; // delimiter

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits), tagLength: 128 },
    aesKey,
    padded,
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const localPubBytes = new Uint8Array(localPublicKeyRaw);
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPubBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = localPubBytes.length;
  header.set(localPubBytes, 21);

  const body = new Uint8Array(header.length + ciphertext.byteLength);
  body.set(header);
  body.set(new Uint8Array(ciphertext), header.length);

  return { encrypted: body, salt, localPublicKey: localPubBytes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, body, url, icon } = await req.json();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error) throw error;

    const payload = JSON.stringify({
      title,
      body,
      url: url || "https://konovartechtist.com/waitlist",
      icon: icon || "/placeholder.svg",
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions || []) {
      try {
        const { encrypted } = await encryptPayload(payload, sub.p256dh, sub.auth);
        const vapidHeaders = await generateVapidAuthHeader(sub.endpoint, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            Authorization: vapidHeaders.authorization,
            TTL: "86400",
          },
          body: encrypted,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          failed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed, total: (subscriptions || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
