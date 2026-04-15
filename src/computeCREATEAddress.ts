import { keccak256 } from '@quentinadam/hash/keccak256';
import * as rlp from '@quentinadam/rlp';

export default function computeCREATEAddress(
  { deployer, nonce }: { deployer: string; nonce: bigint | number },
  { addressFromBytes, bytesFromAddress }: {
    addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
    bytesFromAddress: (address: string) => Uint8Array<ArrayBuffer>;
  },
): string {
  const bytes = keccak256(rlp.encode([bytesFromAddress(deployer), nonce])).slice(-20);
  return addressFromBytes(bytes);
}
