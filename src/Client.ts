import * as z from '@quentinadam/zod';
import type ABI from './ABI.ts';
import type Block from './Block.ts';
import ClientError from './ClientError.ts';
import type ClientHelper from './ClientHelper.ts';
import type Log from './Log.ts';
import type Transaction from './Transaction.ts';
import type TransactionReceipt from './TransactionReceipt.ts';

export default class Client {
  readonly #url: string;
  readonly #helper: ClientHelper;
  #id = 0;

  constructor(url: string, helper: ClientHelper) {
    this.#url = url;
    this.#helper = helper;
  }

  createABI(type: string): ABI {
    return this.#helper.createABI(type);
  }

  async request({ method, params }: { method: string; params?: unknown }): Promise<unknown> {
    const body = JSON.stringify({ method, params, id: this.#id++, jsonrpc: '2.0' });
    const response = await fetch(this.#url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const result = z.union([
      z.object({
        error: z.object({ code: z.number(), message: z.string(), data: z.unknown() }),
      }).transform(({ error }) => {
        return { success: false as const, code: error.code, message: error.message, data: error.data };
      }),
      z.object({ result: z.unknown() }).transform(({ result }) => ({ success: true as const, value: result })),
    ]).parse(await response.json());
    if (!result.success) {
      throw new ClientError({ message: result.message, code: result.code, data: result.data });
    }
    return result.value;
  }

  async call({ contract, data }: {
    contract: string;
    data: Uint8Array<ArrayBuffer> | { method: string; parameters: Uint8Array<ArrayBuffer> | unknown[] };
  }): Promise<Uint8Array<ArrayBuffer>> {
    data = this.#helper.normalizeData(data);
    return this.#helper.BytesSchema.parse(
      await this.request({
        method: 'eth_call',
        params: [{ to: this.#helper.serializeAddress(contract), data: '0x' + data.toHex() }, 'latest'],
      }),
    );
  }

  async getBlockNumber(): Promise<number> {
    const response = await this.request({ method: 'eth_blockNumber' });
    return this.#helper.HexNumberSchema.parse(response);
  }

  async getBlockByNumber(blockNumber: number): Promise<Block | undefined> {
    const response = await this.request({
      method: 'eth_getBlockByNumber',
      params: [`0x${blockNumber.toString(16)}`, false],
    });
    return z.union([
      z.null().transform(() => undefined),
      z.object({
        hash: z.string(),
        parentHash: z.string(),
        number: this.#helper.HexNumberSchema,
        transactions: z.array(z.string()),
        timestamp: this.#helper.HexNumberSchema.transform((value) => new Date(value * 1000)),
      }),
    ]).parse(response);
  }

  async getLogs({ address, fromBlock, toBlock, topics }: {
    fromBlock?: number;
    toBlock?: number;
    address?: string | string[];
    topics?: (null | Uint8Array | Uint8Array[])[];
  }): Promise<Log[]> {
    const response = await this.request({
      method: 'eth_getLogs',
      params: [{
        fromBlock: fromBlock !== undefined ? `0x${fromBlock.toString(16)}` : undefined,
        toBlock: toBlock !== undefined ? `0x${toBlock.toString(16)}` : undefined,
        address: address === undefined
          ? undefined
          : typeof address === 'string'
          ? this.#helper.serializeAddress(address)
          : address.map((address) => this.#helper.serializeAddress(address)),
        topics: topics?.map((topic) => {
          return topic !== null
            ? topic instanceof Uint8Array ? '0x' + topic.toHex() : topic.map((topic) => '0x' + topic.toHex())
            : null;
        }),
      }],
    });
    return z.array(this.#helper.LogSchema).parse(response);
  }

  async getStorageAt({ address, position }: {
    address: string;
    position: string | number | bigint | Uint8Array<ArrayBuffer>;
  }): Promise<Uint8Array<ArrayBuffer>> {
    if (typeof position === 'number' || typeof position === 'bigint') {
      position = '0x' + position.toString(16);
    } else if (position instanceof Uint8Array) {
      position = '0x' + position.toHex();
    }
    const response = await this.request({
      method: 'eth_getStorageAt',
      params: [this.#helper.serializeAddress(address), position, 'latest'],
    });
    return this.#helper.BytesSchema.parse(response);
  }

  async getTransaction(hash: string): Promise<Transaction | undefined> {
    return this.#helper.TransactionSchema.parse(
      await this.request({
        method: 'eth_getTransactionByHash',
        params: [this.#helper.serializeHash(hash)],
      }),
    );
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt | undefined> {
    return this.#helper.TransactionReceiptSchema.parse(
      await this.request({
        method: 'eth_getTransactionReceipt',
        params: [this.#helper.serializeHash(hash)],
      }),
    );
  }

  async estimateGas({ from, to, value, data }: {
    from: string;
    to?: string;
    value?: bigint;
    data?: Uint8Array<ArrayBuffer> | { method: string; parameters: Uint8Array<ArrayBuffer> | unknown[] };
  }): Promise<number> {
    if (data !== undefined) {
      data = this.#helper.normalizeData(data);
    }
    const result = await this.request({
      method: 'eth_estimateGas',
      params: [{
        from,
        value: `0x${(value ?? 0n).toString(16)}`,
        to,
        data: '0x' + (data ?? new Uint8Array(0)).toHex(),
      }],
    });
    return this.#helper.HexNumberSchema.parse(result);
  }

  async getChainId(): Promise<number> {
    const result = await this.request({ method: 'eth_chainId', params: [] });
    return this.#helper.HexNumberSchema.parse(result);
  }
}
