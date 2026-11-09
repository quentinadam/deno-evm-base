export type Transaction = {
  blockHash: string;
  blockNumber: number;
  from: string;
  gasPrice: number;
  hash: string;
  nonce: number;
  r: bigint;
  s: bigint;
  to: string | undefined;
  transactionIndex: number;
  type: number;
  value: number;
  v: number;
};
