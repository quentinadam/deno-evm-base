import type { PublicKey as Secp256k1PublicKey } from '@quentinadam/secp256k1';
import { keccak256 } from '@quentinadam/hash/keccak256';

export class PublicKey {
  readonly #publicKey: Secp256k1PublicKey;
  readonly #addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;

  constructor({ publicKey, addressFromBytes }: {
    publicKey: Secp256k1PublicKey;
    addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
  }) {
    this.#publicKey = publicKey;
    this.#addressFromBytes = addressFromBytes;
  }

  toBytes(compressed = true): Uint8Array<ArrayBuffer> {
    return this.#publicKey.toBytes(compressed);
  }

  toAddress(): string {
    return this.#addressFromBytes(keccak256(this.#publicKey.toBytes(false).slice(1)).slice(-20));
  }
}
