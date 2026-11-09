export type Log = {
  address: string;
  topics: Uint8Array<ArrayBuffer>[];
  data: Uint8Array<ArrayBuffer>;
  blockHash: string;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp?: Date;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
};
