import keccak256 from '@quentinadam/hash/keccak256';
import { concat, fromUintBE } from '@quentinadam/uint8array-extension';

export default function computeCREATE2Address(
  params:
    & { deployer: string; salt: bigint | number | Uint8Array<ArrayBuffer> }
    & (
      | { bytecodeHash: Uint8Array<ArrayBuffer>; bytecode?: undefined; constructorArguments?: undefined }
      | { bytecodeHash?: undefined; bytecode: Uint8Array<ArrayBuffer>; constructorArguments?: Uint8Array<ArrayBuffer> }
    ),
  { prefixByte, addressFromBytes, bytesFromAddress }: {
    prefixByte: number;
    addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
    bytesFromAddress: (address: string) => Uint8Array<ArrayBuffer>;
  },
): string {
  const { deployer, salt } = params;
  const bytecodeHash = (() => {
    const { bytecodeHash, bytecode, constructorArguments } = params;
    if (bytecodeHash !== undefined) {
      return bytecodeHash;
    }
    return keccak256(concat([bytecode, constructorArguments].filter((chunk) => chunk !== undefined)));
  })();
  const bytes = keccak256(concat([
    new Uint8Array(prefixByte),
    bytesFromAddress(deployer),
    salt instanceof Uint8Array ? salt : fromUintBE(salt, 32),
    bytecodeHash,
  ])).slice(-20);
  return addressFromBytes(bytes);
}
