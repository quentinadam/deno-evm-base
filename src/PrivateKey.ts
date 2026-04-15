import type { PrivateKey as Secp256k1PrivateKey, Signature } from '@quentinadam/secp256k1';
import { keccak256 } from '@quentinadam/hash/keccak256';

export default class PrivateKey {
  readonly #privateKey: Secp256k1PrivateKey;
  readonly #addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;

  constructor({ privateKey, addressFromBytes }: {
    privateKey: Secp256k1PrivateKey;
    addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
  }) {
    this.#privateKey = privateKey;
    this.#addressFromBytes = addressFromBytes;
  }

  sign(hash: Uint8Array<ArrayBuffer>): Signature {
    return this.#privateKey.sign(hash);
  }

  toBytes(): Uint8Array<ArrayBuffer> {
    return this.#privateKey.toBytes();
  }

  toAddress(): string {
    return this.#addressFromBytes(keccak256(this.#privateKey.getPublicKey().toBytes(false).slice(1)).slice(-20));
  }
}
