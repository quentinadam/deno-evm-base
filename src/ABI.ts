import assert from '@quentinadam/assert';
import * as Uint8ArrayExtension from '@quentinadam/uint8array-extension';
import { keccak256 } from '@quentinadam/hash/keccak256';
import ensure from '@quentinadam/ensure';
import { deserializeBytes } from './deserializeBytes.ts';

abstract class Element {
  readonly encodedLength: number | undefined;

  constructor(encodedLength: number | undefined) {
    this.encodedLength = encodedLength;
  }

  get dynamic(): boolean {
    return this.encodedLength === undefined;
  }

  abstract encode(value: unknown): Uint8Array<ArrayBuffer>;

  abstract decode(bytes: Uint8Array<ArrayBuffer>): unknown;
}

function parseBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      return deserializeBytes(value);
    } catch {
      // Ignore error and throw a more specific one below
    }
  }
  throw new TypeError('Value must be a Uint8Array or a hexadecimal string');
}

function parseBigInt(value: unknown) {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    assert(Number.isSafeInteger(value), 'Value must be a safe integer');
    return BigInt(value);
  }
  if (typeof value === 'string') {
    try {
      return BigInt(value);
    } catch {
      throw new TypeError('Value must be a valid bigint string');
    }
  }
  throw new TypeError('Value must be a bigint, a number, or a hex string');
}

class IntElement extends Element {
  readonly bits;

  constructor(bits: number) {
    super(32);
    assert(Number.isSafeInteger(bits), 'Bits must be an integer');
    assert(bits % 8 === 0, 'Bits must be a multiple of 8');
    assert(bits >= 8 && bits <= 256, 'Bits must be between 8 and 256');
    this.bits = bits;
  }

  override encode(value: unknown): Uint8Array<ArrayBuffer> {
    return Uint8ArrayExtension.padStart(Uint8ArrayExtension.fromIntBE(parseBigInt(value), this.bits / 8), 32);
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): bigint {
    assert(bytes.length >= 32);
    const value = Uint8ArrayExtension.toBigUintBE(bytes.slice(0, 32));
    return (value >= (1n << 255n)) ? value - (1n << 256n) : value;
  }
}

class UintElement extends Element {
  readonly bits;

  constructor(bits: number) {
    super(32);
    assert(Number.isSafeInteger(bits), 'Bits must be an integer');
    assert(bits % 8 === 0, 'Bits must be a multiple of 8');
    assert(bits >= 8 && bits <= 256, 'Bits must be between 8 and 256');
    this.bits = bits;
  }

  override encode(value: unknown): Uint8Array<ArrayBuffer> {
    return Uint8ArrayExtension.padStart(Uint8ArrayExtension.fromUintBE(parseBigInt(value), this.bits / 8), 32);
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): bigint {
    assert(bytes.length >= 32);
    return Uint8ArrayExtension.toBigUintBE(bytes.slice(0, 32));
  }
}

class BoolElement extends Element {
  constructor() {
    super(32);
  }

  override encode(value: unknown): Uint8Array<ArrayBuffer> {
    assert(typeof value === 'boolean', 'Value must be a boolean');
    return ((value) => {
      return Uint8ArrayExtension.fromUintBE(value ? 1 : 0, 32);
    })(value);
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): boolean {
    assert(bytes.length >= 32);
    const value = Uint8ArrayExtension.toBigUintBE(bytes.slice(0, 32));
    if (value === 0n) {
      return false;
    } else {
      assert(value === 1n);
      return true;
    }
  }
}

abstract class AddressElement extends Element {
  abstract bytesFromAddress(address: string): Uint8Array<ArrayBuffer>;
  abstract addressFromBytes(bytes: Uint8Array<ArrayBuffer>): string;

  constructor() {
    super(32);
  }

  override encode(value: unknown): Uint8Array<ArrayBuffer> {
    assert(typeof value === 'string', 'Value must be a string');
    const bytes = this.bytesFromAddress(value);
    assert(bytes.length === 20, 'Buffer must be 20 bytes long');
    return Uint8ArrayExtension.padStart(bytes, 32);
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): string {
    assert(bytes.length >= 32);
    assert(bytes.slice(0, 12).every((byte) => byte === 0), 'First 12 bytes must be zero');
    return this.addressFromBytes(bytes.slice(12, 32));
  }
}

class StringElement extends Element {
  constructor() {
    super(undefined);
  }

  override encode(value: unknown): Uint8Array<ArrayBuffer> {
    assert(typeof value === 'string', 'Value must be a string');
    const bytes = new TextEncoder().encode(value);
    const length = bytes.length;
    return Uint8ArrayExtension.concat([Uint8ArrayExtension.fromUintBE(length, 32), padEnd(bytes)]);
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): string {
    assert(bytes.length >= 32);
    const length = Number(Uint8ArrayExtension.toBigUintBE(bytes.slice(0, 32)));
    assert(bytes.length >= 32 + padLength(length));
    return new TextDecoder().decode(bytes.slice(32, 32 + length));
  }
}

class BytesElement extends Element {
  readonly length;

  constructor(length?: number) {
    super(length === undefined ? undefined : 32);
    if (length !== undefined) {
      assert(Number.isSafeInteger(length), 'Length must be an integer');
      assert(length >= 1 && length <= 32, 'Length must be between 1 and 32');
    }
    this.length = length;
  }

  override encode(value: unknown): Uint8Array<ArrayBuffer> {
    const bytes = parseBytes(value);
    const length = bytes.length;
    if (this.length !== undefined) {
      return padEnd(bytes);
    } else {
      return Uint8ArrayExtension.concat([Uint8ArrayExtension.fromUintBE(length, 32), padEnd(bytes)]);
    }
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    assert(bytes.length >= 32);
    if (this.length !== undefined) {
      return bytes.slice(0, this.length);
    } else {
      const length = Number(Uint8ArrayExtension.toBigUintBE(bytes.slice(0, 32)));
      assert(bytes.length >= 32 + padLength(length));
      return bytes.slice(32, 32 + length);
    }
  }
}

function padLength(length: number): number {
  return length + (32 - length % 32) % 32;
}

function padEnd(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8ArrayExtension.padEnd(bytes, padLength(bytes.length));
}

class StructElement extends Element {
  readonly elements;

  constructor(elements: Element[]) {
    super((() => {
      let encodedLength = 0;
      for (const element of elements) {
        if (element.encodedLength === undefined) {
          return undefined;
        }
        encodedLength += element.encodedLength;
      }
      return encodedLength;
    })());
    this.elements = elements;
  }

  override encode(value: unknown): Uint8Array<ArrayBuffer> {
    assert(Array.isArray(value), 'Value must be an array');
    return encode({ elements: this.elements, values: value });
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): unknown[] {
    let offset = 0;
    return this.elements.map((element) => {
      const encodedLength = element.encodedLength;
      if (encodedLength === undefined) {
        const _offset = Number(Uint8ArrayExtension.toBigUintBE(bytes.slice(offset, offset + 32)));
        const value = element.decode(bytes.slice(_offset));
        offset += 32;
        return value;
      } else {
        const value = element.decode(bytes.slice(offset));
        offset += encodedLength;
        return value;
      }
    });
  }
}

function encode({ elements, values }: { elements: Element[]; values: unknown[] }): Uint8Array<ArrayBuffer> {
  assert(values.length === elements.length, 'Array length must match');
  return ((elements) => {
    let offset = 0;
    for (const { dynamic, encodedValue } of elements) {
      if (dynamic) {
        offset += 32;
      } else {
        offset += encodedValue.length;
      }
    }
    const heads = new Array<Uint8Array<ArrayBuffer>>();
    const tails = new Array<Uint8Array<ArrayBuffer>>();
    for (const { dynamic, encodedValue } of elements) {
      if (dynamic) {
        heads.push(Uint8ArrayExtension.fromUintBE(offset, 32));
        tails.push(encodedValue);
        offset += encodedValue.length;
      } else {
        heads.push(encodedValue);
      }
    }
    return Uint8ArrayExtension.concat([...heads, ...tails]);
  })(elements.map((element, index) => {
    const value = values[index];
    const encodedValue = element.encode(value);
    return { dynamic: element.dynamic, encodedValue };
  }));
}

class ArrayElement extends Element {
  readonly element;
  readonly length;

  constructor(element: Element, length?: number) {
    super(length === undefined || element.encodedLength === undefined ? undefined : element.encodedLength * length);
    this.element = element;
    this.length = length;
  }

  override encode(values: unknown): Uint8Array<ArrayBuffer> {
    assert(Array.isArray(values), 'Value must be an array');
    const encodedValue = encode({ elements: new Array(values.length).fill(this.element), values });
    if (this.length !== undefined) {
      assert(values.length === this.length, 'Array length must match');
      return encodedValue;
    } else {
      return Uint8ArrayExtension.concat([Uint8ArrayExtension.fromUintBE(values.length, 32), encodedValue]);
    }
  }

  override decode(bytes: Uint8Array<ArrayBuffer>): unknown[] {
    const { length, dataOffset } = (() => {
      if (this.length === undefined) {
        // Dynamic array: read length from first 32 bytes
        assert(bytes.length >= 32);
        return { length: Number(Uint8ArrayExtension.toBigUintBE(bytes.slice(0, 32))), dataOffset: 32 };
      } else {
        // Fixed array: use predefined length, no length prefix
        return { length: this.length, dataOffset: 0 };
      }
    })();
    const encodedElementLength = this.element.encodedLength;
    if (encodedElementLength === undefined) {
      // Dynamic elements: use offsets
      assert(bytes.length >= dataOffset + length * 32);
      return Array.from({ length }, (_, index) => {
        const offset = Number(
          Uint8ArrayExtension.toBigUintBE(bytes.slice(dataOffset + index * 32, dataOffset + (index + 1) * 32)),
        );
        return this.element.decode(bytes.slice(dataOffset + offset));
      });
    } else {
      // Static elements: decode sequentially
      assert(bytes.length >= dataOffset + length * encodedElementLength);
      return Array.from({ length }, (_, index) => {
        const offset = dataOffset + index * encodedElementLength;
        return this.element.decode(bytes.slice(offset, offset + encodedElementLength));
      });
    }
  }
}

export class ABI {
  readonly #addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
  readonly #bytesFromAddress: (address: string) => Uint8Array<ArrayBuffer>;

  readonly selector?: Uint8Array<ArrayBuffer>;
  readonly type: string;
  readonly element: Element;

  constructor(type: string, { addressFromBytes, bytesFromAddress }: {
    addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
    bytesFromAddress: (address: string) => Uint8Array<ArrayBuffer>;
  }) {
    this.type = type;
    this.#addressFromBytes = addressFromBytes;
    this.#bytesFromAddress = bytesFromAddress;
    const match = type.match(/^([^\(\)]+)(\(.*\))$/);
    if (match !== null) {
      const method = ensure(match[1]);
      type = ensure(match[2]);
      this.selector = keccak256(new TextEncoder().encode(`${method}${type}`)).slice(0, 4);
    }
    this.element = this.#parse(type);
  }

  decode(bytes: Uint8Array<ArrayBuffer>): unknown {
    if (this.selector !== undefined) {
      assert(bytes.length >= 4);
      assert(Uint8ArrayExtension.equals(bytes.slice(0, 4), this.selector));
      bytes = bytes.slice(4);
    }
    return this.element.decode(bytes);
  }

  encode(value: unknown): Uint8Array<ArrayBuffer> {
    let bytes = this.element.encode(value);
    if (this.selector !== undefined) {
      bytes = Uint8ArrayExtension.concat([this.selector, bytes]);
    }
    return bytes;
  }

  #parse(type: string): Element {
    const parsers: { regex: RegExp; fn: (match: RegExpMatchArray) => Element }[] = [
      {
        regex: /^(.+)\[([1-9]\d*)\]$/,
        fn: (match) => new ArrayElement(this.#parse(ensure(match[1])), Number(ensure(match[2]))),
      },
      { regex: /^(.+)\[\]$/, fn: (match) => new ArrayElement(this.#parse(ensure(match[1]))) },
      {
        regex: /^\((.*)\)$/,
        fn: (match) => {
          const inner = ensure(match[1]);
          const elements = new Array<Element>();
          let element = '';
          let depth = 0;
          for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (char === ',' && depth === 0) {
              elements.push(this.#parse(element));
              element = '';
            } else {
              if (char === '(') {
                depth++;
              } else if (char === ')') {
                depth--;
              }
              element += char;
            }
          }
          assert(depth === 0, 'Unbalanced parentheses');
          if (element !== '') {
            elements.push(this.#parse(element));
          }
          return new StructElement(elements);
        },
      },
      { regex: /^uint([1-9]\d*)$/, fn: (match) => new UintElement(Number(ensure(match[1]))) },
      { regex: /^int([1-9]\d*)$/, fn: (match) => new IntElement(Number(ensure(match[1]))) },
      { regex: /^bytes([1-9]\d*)$/, fn: (match) => new BytesElement(Number(ensure(match[1]))) },
      { regex: /^bytes$/, fn: () => new BytesElement() },
      { regex: /^string$/, fn: () => new StringElement() },
      { regex: /^bool$/, fn: () => new BoolElement() },
      {
        regex: /^address$/,
        fn: () => {
          const bytesFromAddress = this.#bytesFromAddress.bind(this);
          const addressFromBytes = this.#addressFromBytes.bind(this);
          return new class extends AddressElement {
            bytesFromAddress(address: string) {
              return bytesFromAddress(address);
            }
            addressFromBytes(bytes: Uint8Array<ArrayBuffer>) {
              return addressFromBytes(bytes);
            }
          }();
        },
      },
    ];
    try {
      for (const { regex, fn } of parsers) {
        const match = type.match(regex);
        if (match) {
          return fn(match);
        }
      }
      throw new TypeError('No match');
    } catch (_) {
      throw new TypeError(`Failed to parse "${type}"`);
    }
  }
}
