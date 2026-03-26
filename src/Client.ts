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
  readonly #logger?: { log: (...args: unknown[]) => void };

  constructor(
    url: string,
    { helper, logger }: { helper: ClientHelper; logger?: { log: (...args: unknown[]) => void } },
  ) {
    this.#url = url;
    this.#helper = helper;
    this.#logger = logger;
  }

  createABI(type: string): ABI {
    return this.#helper.createABI(type);
  }

  async request({ method, params }: { method: string; params?: unknown }): Promise<unknown> {
    const body = JSON.stringify({ method, params, id: this.#id++, jsonrpc: '2.0' });
    this.#logger?.log('POST', this.#url, body);
    const response = await fetch(this.#url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const text = await response.text();
    this.#logger?.log(response.status, text);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const result = z.union([
      z.object({
        error: z.object({ code: z.number(), message: z.string(), data: z.unknown() }),
      }).transform(({ error }) => {
        return { success: false as const, code: error.code, message: error.message, data: error.data };
      }),
      z.object({ result: z.unknown() }).transform(({ result }) => ({ success: true as const, value: result })),
    ]).parse(JSON.parse(text));
    if (!result.success) {
      throw new ClientError({ message: result.message, code: result.code, data: result.data });
    }
    return result.value;
  }

  async call({ to, data }: {
    to: string;
    data: Uint8Array<ArrayBuffer> | string | {
      method: string;
      parameters: Uint8Array<ArrayBuffer> | string | unknown[];
    };
  }): Promise<Uint8Array<ArrayBuffer>> {
    data = this.#helper.normalizeData(data);
    return this.#helper.BytesSchema.parse(
      await this.request({
        method: 'eth_call',
        params: [{ to: this.#helper.serializeAddress(to), data: this.#helper.serializeBytes(data) }, 'latest'],
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
      params: [this.#helper.serializeInteger(blockNumber), false],
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
        fromBlock: fromBlock !== undefined ? this.#helper.serializeInteger(fromBlock) : undefined,
        toBlock: toBlock !== undefined ? this.#helper.serializeInteger(toBlock) : undefined,
        address: address === undefined
          ? undefined
          : typeof address === 'string'
          ? this.#helper.serializeAddress(address)
          : address.map((address) => this.#helper.serializeAddress(address)),
        topics: topics?.map((topic) => {
          return topic !== null
            ? topic instanceof Uint8Array
              ? this.#helper.serializeBytes(topic)
              : topic.map((topic) => this.#helper.serializeBytes(topic))
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
      position = this.#helper.serializeInteger(position);
    } else if (position instanceof Uint8Array) {
      position = this.#helper.serializeBytes(position);
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
        from: this.#helper.serializeAddress(from),
        value: this.#helper.serializeInteger(value ?? 0),
        to: to !== undefined ? this.#helper.serializeAddress(to) : undefined,
        data: this.#helper.serializeBytes(data ?? new Uint8Array(0)),
      }],
    });
    return this.#helper.HexNumberSchema.parse(result);
  }

  async getChainId(): Promise<number> {
    const result = await this.request({ method: 'eth_chainId', params: [] });
    return this.#helper.HexNumberSchema.parse(result);
  }
}
