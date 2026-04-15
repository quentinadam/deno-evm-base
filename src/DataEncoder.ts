import { concat } from '@quentinadam/uint8array-extension';
import { keccak256 } from '@quentinadam/hash/keccak256';
import type ABI from './ABI.ts';
import deserializeBytes from './deserializeBytes.ts';

export default class DataEncoder {
  readonly #createABI: (type: string) => ABI;

  constructor(createABI: (type: string) => ABI) {
    this.#createABI = createABI;
  }

  encode({ method, parameters }: {
    method: string;
    parameters: Uint8Array<ArrayBuffer> | string | unknown[];
  }): Uint8Array<ArrayBuffer> {
    if (parameters instanceof Uint8Array) {
      return concat([keccak256(method).slice(0, 4), parameters]);
    }
    if (typeof parameters === 'string') {
      return concat([keccak256(method).slice(0, 4), deserializeBytes(parameters)]);
    }
    return this.#createABI(method).encode(parameters);
  }

  normalize(
    data: Uint8Array<ArrayBuffer> | string | {
      method: string;
      parameters: Uint8Array<ArrayBuffer> | string | unknown[];
    },
  ): Uint8Array<ArrayBuffer> {
    if (data instanceof Uint8Array) {
      return data;
    }
    if (typeof data === 'string') {
      return deserializeBytes(data);
    }
    return this.encode(data);
  }
}
