import { assert } from '@quentinadam/assert';
import { ensure } from '@quentinadam/ensure';
import { Client } from './Client.ts';
import { ClientHelper } from './ClientHelper.ts';

const helper = new ClientHelper({
  addressFromBytes: (bytes) => bytes.toHex(),
  bytesFromAddress: (address) => Uint8Array.fromHex(address),
  serializeHash: (hash) => hash,
  deserializeHash: (hash) => hash,
});

Deno.test('Client sends requests through the given fetcher', async () => {
  const requests: { url: string; options: RequestInit | undefined }[] = [];
  const fetcher = {
    fetch: async (url: string, options?: RequestInit) => {
      requests.push({ url, options });
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: '0x1' }));
    },
  };
  const client = new Client('https://rpc.example', { helper, fetcher });
  assert(await client.getChainId() === 1);
  assert(requests.length === 1);
  const [request] = requests;
  assert(request !== undefined && request.url === 'https://rpc.example' && request.options?.method === 'POST');
  assert(request.options.body === JSON.stringify({ method: 'eth_chainId', params: [], id: 0, jsonrpc: '2.0' }));
});

Deno.test('Client sends the given headers with every request, keeping its own Content-Type', async () => {
  const headers: Headers[] = [];
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      headers.push(new Headers(options?.headers));
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: '0x1' }));
    },
  };
  const client = new Client('https://rpc.example', {
    helper,
    fetcher,
    headers: { Authorization: 'Bearer token', 'content-type': 'text/plain' },
  });
  await client.getChainId();
  const [request] = headers;
  assert(request !== undefined && request.get('Authorization') === 'Bearer token');
  assert(request.get('Content-Type') === 'application/json');
});

Deno.test('Client gets the code at an address, empty when there is no contract', async () => {
  const requests: unknown[] = [];
  const results = ['0x6080', '0x'];
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      requests.push(JSON.parse(String(options?.body)));
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: results.shift() }));
    },
  };
  const client = new Client('https://rpc.example', { helper, fetcher });
  const address = '00000000000000000000000000000000000000aa';
  assert((await client.getCode({ address })).toHex() === '6080');
  assert((await client.getCode({ address })).length === 0);
  assert(
    JSON.stringify(requests[0]) ===
      JSON.stringify({ method: 'eth_getCode', params: ['0x' + address, 'latest'], id: 0, jsonrpc: '2.0' }),
  );
});

Deno.test('Client gets a block by number or the latest one, with its base fee when the chain has one', async () => {
  const requests: unknown[] = [];
  const block = { hash: '0x01', parentHash: '0x02', number: '0x10', transactions: [], timestamp: '0x3e8' };
  const results = [{ ...block, baseFeePerGas: '0x3b9aca00' }, block];
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      requests.push(JSON.parse(String(options?.body)).params);
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: results.shift() }));
    },
  };
  const client = new Client('https://rpc.example', { helper, fetcher });
  assert((await client.getBlockByNumber('latest'))?.baseFeePerGas === 1_000_000_000n);
  assert((await client.getBlockByNumber(16))?.baseFeePerGas === undefined);
  assert(JSON.stringify(requests) === JSON.stringify([['latest', false], ['0x10', false]]));
});

Deno.test('Client gets the max priority fee per gas', async () => {
  const requests: unknown[] = [];
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      requests.push(JSON.parse(String(options?.body)));
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: '0x59682f00' }));
    },
  };
  const client = new Client('https://rpc.example', { helper, fetcher });
  assert(await client.getMaxPriorityFeePerGas() === 1_500_000_000n);
  assert(
    JSON.stringify(requests[0]) ===
      JSON.stringify({ method: 'eth_maxPriorityFeePerGas', params: [], id: 0, jsonrpc: '2.0' }),
  );
});

Deno.test('Client gets a receipt, with the created contract for a creation and the recipient for a call', async () => {
  const receipt = {
    blockHash: '0x01',
    blockNumber: '0x10',
    from: '0x00000000000000000000000000000000000000aa',
    logs: [],
    status: '0x1',
    transactionHash: '0x02',
    transactionIndex: '0x0',
    type: '0x2',
  };
  const results = [
    { ...receipt, to: null, contractAddress: '0x00000000000000000000000000000000000000bb' },
    { ...receipt, to: '0x00000000000000000000000000000000000000cc', contractAddress: null },
  ];
  const fetcher = {
    fetch: async () => await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: results.shift() })),
  };
  const client = new Client('https://rpc.example', { helper, fetcher });
  const creation = await client.getTransactionReceipt('0x02');
  assert(
    creation !== undefined && creation.to === undefined &&
      creation.contractAddress === '00000000000000000000000000000000000000bb',
  );
  const call = await client.getTransactionReceipt('0x02');
  assert(call?.to === '00000000000000000000000000000000000000cc' && call.contractAddress === undefined);
});

Deno.test('Client parses logs, with their block timestamp when the node returns it', async () => {
  const log = {
    address: '0x00000000000000000000000000000000000000aa',
    topics: ['0x01'],
    data: '0x02',
    blockHash: '0x03',
    transactionHash: '0x04',
    blockNumber: '0x10',
    transactionIndex: '0x0',
    logIndex: '0x1',
    removed: false,
  };
  const fetcher = {
    fetch: async () => {
      return await Promise.resolve(
        Response.json({ jsonrpc: '2.0', id: 0, result: [{ ...log, blockTimestamp: '0x3e8' }, log] }),
      );
    },
  };
  const client = new Client('https://rpc.example', { helper, fetcher });
  const [stamped, unstamped] = await client.getLogs({});
  assert(stamped?.blockTimestamp?.getTime() === 1_000_000 && stamped.topics[0]?.toHex() === '01');
  assert(unstamped !== undefined && unstamped.blockTimestamp === undefined);
  const parsed = client.parseLog({ ...log, blockTimestamp: '0x3e8' });
  assert(parsed.blockTimestamp?.getTime() === 1_000_000 && parsed.logIndex === 1);
});

Deno.test('Client gets a block by hash', async () => {
  const requests: unknown[] = [];
  const results = [{ hash: '0x01', parentHash: '0x02', number: '0x10', transactions: [], timestamp: '0x3e8' }, null];
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      requests.push(JSON.parse(String(options?.body)));
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: results.shift() }));
    },
  };
  const client = new Client('https://rpc.example', { helper, fetcher });
  assert((await client.getBlockByHash('0x01'))?.timestamp.getTime() === 1_000_000);
  assert(await client.getBlockByHash('0x03') === undefined);
  assert(
    JSON.stringify(requests[0]) ===
      JSON.stringify({ method: 'eth_getBlockByHash', params: ['0x01', false], id: 0, jsonrpc: '2.0' }),
  );
});

Deno.test("Client gives a block's hashes in the chain's hash format, as it gives a log's", async () => {
  const unprefixedHelper = new ClientHelper({
    addressFromBytes: (bytes) => bytes.toHex(),
    bytesFromAddress: (address) => Uint8Array.fromHex(address),
    serializeHash: (hash) => '0x' + hash,
    deserializeHash: (hash) => hash.slice(2),
  });
  const requests: unknown[] = [];
  const block = { hash: '0x01', parentHash: '0x02', number: '0x10', transactions: ['0x03'], timestamp: '0x3e8' };
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      requests.push(JSON.parse(String(options?.body)).params);
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: block }));
    },
  };
  const client = new Client('https://rpc.example', { helper: unprefixedHelper, fetcher });
  const { hash, parentHash, transactions } = ensure(await client.getBlockByHash('01'));
  assert(hash === '01' && parentHash === '02' && transactions[0] === '03');
  assert(JSON.stringify(requests) === JSON.stringify([['0x01', false]]));
});
