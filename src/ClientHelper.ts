import { assert } from '@quentinadam/assert';
import * as z from '@quentinadam/zod';
import { ABI } from './ABI.ts';
import type { Block } from './Block.ts';
import { DataEncoder } from './DataEncoder.ts';
import type { Log } from './Log.ts';
import type { Transaction } from './Transaction.ts';
import type { TransactionReceipt } from './TransactionReceipt.ts';
import { deserializeBytes } from './deserializeBytes.ts';

export class ClientHelper {
  readonly #addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
  readonly #bytesFromAddress: (address: string) => Uint8Array<ArrayBuffer>;
  readonly #deserializeHash: (hash: string) => string;
  readonly #serializeHash: (hash: string) => string;
  readonly #dataEncoder: DataEncoder;

  readonly BytesSchema: z.Schema<Uint8Array<ArrayBuffer>> = z.string().transform((string) => {
    return deserializeBytes(string);
  });

  readonly HexNumberSchema: z.Schema<number> = z.string().transform((string) => {
    assert(/0x[0-9a-f]+/i.test(string));
    return Number(string);
  });

  readonly HexBigIntSchema: z.Schema<bigint> = z.string().transform((string) => {
    assert(/0x[0-9a-f]+/i.test(string));
    return BigInt(string);
  });

  readonly AddressSchema: z.Schema<string> = z.string().transform((value) => this.deserializeAddress(value));
  // Null where there is no address: the recipient of a contract creation, or the contract a call created.
  readonly #NullableAddressSchema = z.union([z.null().transform(() => undefined), this.AddressSchema]);
  readonly HashSchema: z.Schema<string> = z.string().transform((value) => this.#deserializeHash(value));

  readonly LogSchema: z.Schema<Log> = z.object({
    address: this.AddressSchema,
    topics: z.array(this.BytesSchema),
    data: this.BytesSchema,
    blockHash: this.HashSchema,
    transactionHash: this.HashSchema,
    blockNumber: this.HexNumberSchema,
    // Absent from nodes that predate the field, such as Geth before 1.16.
    blockTimestamp: this.HexNumberSchema.transform((value) => new Date(value * 1000)).optional(),
    transactionIndex: this.HexNumberSchema,
    logIndex: this.HexNumberSchema,
    removed: z.boolean(),
  });

  readonly BlockSchema: z.Schema<Block | undefined> = z.union([
    z.null().transform(() => undefined),
    z.object({
      hash: z.string(),
      parentHash: z.string(),
      number: this.HexNumberSchema,
      transactions: z.array(z.string()),
      timestamp: this.HexNumberSchema.transform((value) => new Date(value * 1000)),
      // Absent before London and on chains without EIP-1559.
      baseFeePerGas: this.HexBigIntSchema.optional(),
    }),
  ]);

  readonly TransactionSchema: z.Schema<Transaction | undefined> = z.union([
    z.null().transform(() => undefined),
    z.object({
      blockHash: this.HashSchema,
      blockNumber: this.HexNumberSchema,
      from: this.AddressSchema,
      gasPrice: this.HexNumberSchema,
      hash: this.HashSchema,
      nonce: this.HexNumberSchema,
      r: this.HexBigIntSchema,
      s: this.HexBigIntSchema,
      to: this.#NullableAddressSchema,
      transactionIndex: this.HexNumberSchema,
      type: this.HexNumberSchema,
      value: this.HexNumberSchema,
      v: this.HexNumberSchema,
    }),
  ]);

  readonly TransactionReceiptSchema: z.Schema<TransactionReceipt | undefined> = z.union([
    z.null().transform(() => undefined),
    z.object({
      blockHash: this.HashSchema,
      blockNumber: this.HexNumberSchema,
      contractAddress: this.#NullableAddressSchema,
      from: this.AddressSchema,
      logs: z.array(this.LogSchema),
      status: this.HexNumberSchema,
      to: this.#NullableAddressSchema,
      transactionHash: this.HashSchema,
      transactionIndex: this.HexNumberSchema,
      type: this.HexNumberSchema,
    }).transform(({ status, transactionHash, ...rest }) => ({
      ...rest,
      hash: transactionHash,
      success: (() => {
        if (status === 0) {
          return false;
        }
        if (status === 1) {
          return true;
        }
        throw new Error('Invalid transaction status');
      })(),
    })),
  ]);

  constructor({ addressFromBytes, bytesFromAddress, deserializeHash, serializeHash }: {
    addressFromBytes: (bytes: Uint8Array<ArrayBuffer>) => string;
    bytesFromAddress: (address: string) => Uint8Array<ArrayBuffer>;
    deserializeHash: (hash: string) => string;
    serializeHash: (hash: string) => string;
  }) {
    this.#addressFromBytes = addressFromBytes;
    this.#bytesFromAddress = bytesFromAddress;
    this.#deserializeHash = deserializeHash;
    this.#serializeHash = serializeHash;
    this.#dataEncoder = new DataEncoder((type) => this.createABI(type));
  }

  serializeInteger(number: number | bigint): string {
    return '0x' + number.toString(16);
  }

  serializeBytes(bytes: Uint8Array): string {
    return '0x' + bytes.toHex();
  }

  deserializeBytes(bytes: string): Uint8Array<ArrayBuffer> {
    return deserializeBytes(bytes);
  }

  deserializeAddress(address: string): string {
    assert(/0x[0-9a-f]{40}/.test(address));
    return this.#addressFromBytes(Uint8Array.fromHex(address.slice(2)));
  }

  serializeAddress(address: string): string {
    return '0x' + this.#bytesFromAddress(address).toHex();
  }

  deserializeHash(hash: string): string {
    return this.#deserializeHash(hash);
  }

  serializeHash(hash: string): string {
    return this.#serializeHash(hash);
  }

  createABI(type: string): ABI {
    return new ABI(type, { bytesFromAddress: this.#bytesFromAddress, addressFromBytes: this.#addressFromBytes });
  }

  normalizeData(
    data: Uint8Array<ArrayBuffer> | string | {
      method: string;
      parameters: Uint8Array<ArrayBuffer> | string | unknown[];
    },
  ): Uint8Array<ArrayBuffer> {
    return this.#dataEncoder.normalize(data);
  }
}
