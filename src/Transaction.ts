type Transaction = {
  blockHash: string;
  blockNumber: number;
  from: string;
  gasPrice: number;
  hash: string;
  nonce: number;
  r: bigint;
  s: bigint;
  to: string;
  transactionIndex: number;
  type: number;
  value: number;
  v: number;
};

export default Transaction;
