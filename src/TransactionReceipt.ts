import type { Log } from './Log.ts';

export type TransactionReceipt = {
  hash: string;
  success: boolean;
  blockHash: string;
  blockNumber: number;
  contractAddress: string | undefined;
  from: string;
  logs: Log[];
  to: string | undefined;
  transactionIndex: number;
  type: number;
};
