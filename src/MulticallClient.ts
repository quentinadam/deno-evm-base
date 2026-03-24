import ensure from '@quentinadam/ensure';
import * as z from '@quentinadam/zod';
import type Client from './Client.ts';

export default class MulticallClient {
  readonly #client;
  readonly #multicallAddress;
  #pendingCalls = new Array<{
    address: string;
    data: Uint8Array<ArrayBuffer>;
    resolve: (value: Uint8Array<ArrayBuffer>) => void;
    reject: (reason: unknown) => void;
  }>();

  constructor({ client, multicallAddress }: {
    client: Client;
    multicallAddress: string;
  }) {
    this.#client = client;
    this.#multicallAddress = multicallAddress;
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.call({
      address: this.#multicallAddress,
      data: { method: 'getBlockNumber()', parameters: [] },
    });
    return Number(z.bigint().parse(this.#client.createABI('uint256').decode(result)));
  }

  async call({ address, data }: {
    address: string;
    data: Uint8Array<ArrayBuffer> | { method: string; parameters: unknown[] };
  }): Promise<Uint8Array<ArrayBuffer>> {
    return await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
      if (data instanceof Uint8Array === false) {
        const { method, parameters } = data;
        data = this.#client.createABI(method).encode(parameters);
      }
      this.#pendingCalls.push({ address, data, resolve, reject });
      queueMicrotask(async () => {
        if (this.#pendingCalls.length > 0) {
          const pendingCalls = this.#pendingCalls;
          this.#pendingCalls = [];
          if (pendingCalls.length > 1) {
            const data = this.#client.createABI('aggregate3((address,bool,bytes)[])').encode(
              [pendingCalls.map(({ address, data }) => [address, true, data])],
            );
            try {
              const result = await this.#client.call({ address: this.#multicallAddress, data });
              const [decoded] = z.tuple([z.array(z.tuple([z.boolean(), z.instanceof(Uint8Array)]))]).parse(
                this.#client.createABI('((bool,bytes)[])').decode(result),
              );
              decoded.forEach(([success, data], index) => {
                const { resolve, reject } = ensure(pendingCalls[index]);
                if (success) {
                  resolve(data);
                } else {
                  reject(new Error(`Execution reverted ${data.toHex()}`));
                }
              });
            } catch (error) {
              for (const { reject } of pendingCalls) {
                reject(error);
              }
            }
          } else {
            const { address, data, resolve, reject } = ensure(pendingCalls[0]);
            try {
              resolve(await this.#client.call({ address, data }));
            } catch (error) {
              reject(error);
            }
          }
        }
      });
    });
  }

  async getBalance(address: string): Promise<bigint> {
    const result = await this.call({
      address: this.#multicallAddress,
      data: { method: 'getEthBalance(address)', parameters: [address] },
    });
    return z.bigint().parse(this.#client.createABI('uint256').decode(result));
  }
}
