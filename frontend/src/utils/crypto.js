// Cryptography utilities for ECDH key exchange and AES-GCM encryption

export async function generateDHKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKey = keyPair.privateKey;
  return { privateKey, publicKey: arrayBufferToBase64(publicKeyRaw) };
}

// Persist and restore ECDH private keys (so history remains decryptable across sessions)
export async function exportPrivateKeyJwk(privateKey) {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  return jwk;
}

export async function importPrivateKeyJwk(jwk) {
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
  return key;
}

export async function computeSharedKey(privateKey, otherPublicKeyBase64) {
  const otherPublicKey = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(otherPublicKeyBase64),
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: otherPublicKey,
    },
    privateKey,
    256
  );
  return sharedSecret;
}

export async function encryptMessage(text, sharedKey) {
  const key = await crypto.subtle.importKey(
    'raw',
    sharedKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  return arrayBufferToBase64(iv) + ':' + arrayBufferToBase64(encrypted);
}

export async function decryptMessage(ciphertext, sharedKey) {
  const key = await crypto.subtle.importKey(
    'raw',
    sharedKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const [ivBase64, encryptedBase64] = ciphertext.split(':');
  const iv = base64ToArrayBuffer(ivBase64);
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
