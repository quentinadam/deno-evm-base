import { assert } from '@quentinadam/assert';
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

Deno.test('Client sends the given headers with every request', async () => {
  const headers: Headers[] = [];
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      headers.push(new Headers(options?.headers));
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: '0x1' }));
    },
  };
  const client = new Client('https://rpc.example', { helper, fetcher, headers: { Authorization: 'Bearer token' } });
  await client.getChainId();
  const [request] = headers;
  assert(request !== undefined && request.get('Authorization') === 'Bearer token');
  assert(request.get('Content-Type') === 'application/json');
});
