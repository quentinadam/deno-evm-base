import type Log from './Log.ts';

type TransactionReceipt = {
  hash: string;
  success: boolean;
  blockHash: string;
  blockNumber: number;
  from: string;
  logs: Log[];
  to: string;
  transactionIndex: number;
  type: number;
};

export default TransactionReceipt;
