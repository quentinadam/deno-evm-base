import concat from '@quentinadam/uint8array-extension/concat';
import keccak256 from '@quentinadam/hash/keccak256';
import type ABI from './ABI.ts';

export default class DataEncoder {
  readonly #createABI: (type: string) => ABI;

  constructor(createABI: (type: string) => ABI) {
    this.#createABI = createABI;
  }

  encode({ method, parameters }: {
    method: string;
    parameters: Uint8Array<ArrayBuffer> | unknown[];
  }): Uint8Array<ArrayBuffer> {
    if (parameters instanceof Uint8Array) {
      return concat([keccak256(method).slice(0, 4), parameters]);
    } else {
      return this.#createABI(method).encode(parameters);
    }
  }

  normalize(
    data: Uint8Array<ArrayBuffer> | { method: string; parameters: Uint8Array<ArrayBuffer> | unknown[] },
  ): Uint8Array<ArrayBuffer> {
    return (data instanceof Uint8Array) ? data : this.encode(data);
  }
}
