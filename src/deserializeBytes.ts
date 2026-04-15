import ensure from '@quentinadam/ensure';

export function deserializeBytes(bytes: string): Uint8Array<ArrayBuffer> {
  const match = bytes.match(/^(?:0x)?(?<hex>(?:[0-9a-f][0-9a-f])*)$/i);
  if (match === null) {
    throw new TypeError('Invalid hexadecimal string');
  }
  return Uint8Array.fromHex(ensure(ensure(match.groups).hex));
}
