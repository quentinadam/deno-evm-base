import { assert } from '@quentinadam/assert';
import { PrivateKey as Secp256k1PrivateKey, PublicKey as Secp256k1PublicKey } from '@quentinadam/secp256k1';
import { PrivateKey } from './PrivateKey.ts';
import { PublicKey } from './PublicKey.ts';

const addressFromBytes = (bytes: Uint8Array<ArrayBuffer>) => `0x${bytes.toHex()}`;
const privateKey = new PrivateKey({
  privateKey: Secp256k1PrivateKey.fromBytes(new Uint8Array(32).with(31, 1)),
  createPublicKey: (publicKey) => new PublicKey({ publicKey, addressFromBytes }),
});

Deno.test('PublicKey derives the address of its private key', () => {
  assert(privateKey.toAddress() === '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf');
  assert(privateKey.getPublicKey().toAddress() === privateKey.toAddress());
});

Deno.test('PublicKey round-trips compressed and uncompressed bytes', () => {
  for (const compressed of [true, false]) {
    const bytes = privateKey.getPublicKey().toBytes(compressed);
    assert(bytes.length === (compressed ? 33 : 65));
    const publicKey = new PublicKey({ publicKey: Secp256k1PublicKey.fromBytes(bytes), addressFromBytes });
    assert(publicKey.toBytes(compressed).toHex() === bytes.toHex());
    assert(publicKey.toAddress() === privateKey.toAddress());
  }
});
