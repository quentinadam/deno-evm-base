import type { Log } from './Log.ts';

export type TransactionReceipt = {
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
