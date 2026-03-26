import ensure from '@quentinadam/ensure';
import { isArrayBufferBacked } from '@quentinadam/uint8array-extension';

export default function parseBytes(value: unknown): Uint8Array<ArrayBuffer> {
  if (value instanceof Uint8Array && isArrayBufferBacked(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const match = value.match(/^(?:0x)?(?<hex>(?:[0-9a-f][0-9a-f])*)$/i);
    if (match !== null) {
      return Uint8Array.fromHex(ensure(ensure(match.groups).hex));
    }
  }
  throw new TypeError('Value must be a Uint8Array or a hexadecimal string');
}
