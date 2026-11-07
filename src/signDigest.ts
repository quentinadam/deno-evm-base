import { assert } from '@quentinadam/assert';
import type { Signer } from './Signer.ts';

const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

// Remote signers must return canonical signatures: nodes reject a high s, and only 0 and 1 are valid recovery ids.
export async function signDigest(
  { signer, digest }: { signer: Signer; digest: Uint8Array<ArrayBuffer> },
): Promise<{ r: bigint; s: bigint; recovery: number }> {
  const { r, s, recovery } = await signer.sign(digest);
  assert(r > 0n && r < N, 'Signature r is out of range');
  assert(s > 0n && s <= N / 2n, 'Signature s is not low');
  assert(recovery === 0 || recovery === 1, 'Signature recovery id is not 0 or 1');
  return { r, s, recovery };
}
