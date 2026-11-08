import type { PrivateKey as Secp256k1PrivateKey, Signature } from '@quentinadam/secp256k1';
import { PublicKey } from './PublicKey.ts';

export class PrivateKey {
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

  getPublicKey(): PublicKey {
    return new PublicKey({ publicKey: this.#privateKey.getPublicKey(), addressFromBytes: this.#addressFromBytes });
  }

  toAddress(): string {
    return this.getPublicKey().toAddress();
  }
}
