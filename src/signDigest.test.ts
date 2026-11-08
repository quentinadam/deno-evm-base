import { assert } from '@quentinadam/assert';
import { PrivateKey as Secp256k1PrivateKey } from '@quentinadam/secp256k1';
import { PrivateKey } from './PrivateKey.ts';
import { PublicKey } from './PublicKey.ts';
import { signDigest } from './signDigest.ts';

const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const digest = new Uint8Array(32).fill(1);
const privateKey = new PrivateKey({
  privateKey: Secp256k1PrivateKey.fromBytes(new Uint8Array(32).fill(2)),
  createPublicKey: (publicKey) => new PublicKey({ publicKey, addressFromBytes: (bytes) => bytes.toHex() }),
});

async function rejects(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

Deno.test('signDigest returns the signature of a private key', async () => {
  const { r, s, recovery } = await signDigest({ signer: privateKey, digest });
  const expected = privateKey.sign(digest);
  assert(r === expected.r && s === expected.s && recovery === expected.recovery);
});

Deno.test('signDigest accepts an async signer', async () => {
  const signer = { sign: async (digest: Uint8Array<ArrayBuffer>) => await Promise.resolve(privateKey.sign(digest)) };
  const { r, s, recovery } = await signDigest({ signer, digest });
  const expected = privateKey.sign(digest);
  assert(r === expected.r && s === expected.s && recovery === expected.recovery);
});

Deno.test('signDigest normalizes a high s', async () => {
  const expected = privateKey.sign(digest);
  const signer = { sign: () => ({ r: expected.r, s: N - expected.s, recovery: expected.recovery ^ 1 }) };
  const { r, s, recovery } = await signDigest({ signer, digest });
  assert(r === expected.r && s === expected.s && recovery === expected.recovery);
});

Deno.test('signDigest rejects an out-of-range s', async () => {
  const { r, recovery } = privateKey.sign(digest);
  const signer = { sign: () => ({ r, s: N, recovery }) };
  assert(await rejects(() => signDigest({ signer, digest })));
});

Deno.test('signDigest rejects an invalid recovery id', async () => {
  const { r, s } = privateKey.sign(digest);
  const signer = { sign: () => ({ r, s, recovery: 27 }) };
  assert(await rejects(() => signDigest({ signer, digest })));
});
