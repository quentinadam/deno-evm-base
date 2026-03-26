import concat from '@quentinadam/uint8array-extension/concat';
import keccak256 from '@quentinadam/hash/keccak256';
import type ABI from './ABI.ts';
import parseBytes from './parseBytes.ts';

export default class DataEncoder {
  readonly #createABI: (type: string) => ABI;

  constructor(createABI: (type: string) => ABI) {
    this.#createABI = createABI;
  }

  encode({ method, parameters }: {
    method: string;
    parameters: Uint8Array<ArrayBuffer> | string | unknown[];
  }): Uint8Array<ArrayBuffer> {
    if (parameters instanceof Uint8Array || typeof parameters === 'string') {
      return concat([keccak256(method).slice(0, 4), parseBytes(parameters)]);
    } else {
      return this.#createABI(method).encode(parameters);
    }
  }

  normalize(
    data: Uint8Array<ArrayBuffer> | string | {
      method: string;
      parameters: Uint8Array<ArrayBuffer> | string | unknown[];
    },
  ): Uint8Array<ArrayBuffer> {
    if (data instanceof Uint8Array || typeof data === 'string') {
      return parseBytes(data);
    } else {
      return this.encode(data);
    }
  }
}
