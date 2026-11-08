import type {
  PrivateKey as Secp256k1PrivateKey,
  PublicKey as Secp256k1PublicKey,
  Signature,
} from '@quentinadam/secp256k1';
import type { PublicKey } from './PublicKey.ts';

export class PrivateKey<T extends PublicKey = PublicKey> {
  readonly #privateKey: Secp256k1PrivateKey;
  readonly #createPublicKey: (publicKey: Secp256k1PublicKey) => T;

  constructor({ privateKey, createPublicKey }: {
    privateKey: Secp256k1PrivateKey;
    createPublicKey: (publicKey: Secp256k1PublicKey) => T;
  }) {
    this.#privateKey = privateKey;
    this.#createPublicKey = createPublicKey;
  }

  sign(hash: Uint8Array<ArrayBuffer>): Signature {
    return this.#privateKey.sign(hash);
  }

  toBytes(): Uint8Array<ArrayBuffer> {
    return this.#privateKey.toBytes();
  }

  getPublicKey(): T {
    return this.#createPublicKey(this.#privateKey.getPublicKey());
  }

  toAddress(): string {
    return this.getPublicKey().toAddress();
  }
}
