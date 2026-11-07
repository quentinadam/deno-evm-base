import { assert } from '@quentinadam/assert';
import type { Signer } from './Signer.ts';

const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

// Nodes reject a high s, so it is replaced by n - s, which with the opposite recovery id is the same signature.
export async function signDigest(
  { signer, digest }: { signer: Signer; digest: Uint8Array<ArrayBuffer> },
): Promise<{ r: bigint; s: bigint; recovery: number }> {
  const { r, s, recovery } = await signer.sign(digest);
  assert(r > 0n && r < N, 'Signature r is out of range');
  assert(s > 0n && s < N, 'Signature s is out of range');
  assert(recovery === 0 || recovery === 1, 'Signature recovery id is not 0 or 1');
  if (s > N / 2n) {
    return { r, s: N - s, recovery: recovery ^ 1 };
  }
  return { r, s, recovery };
}
