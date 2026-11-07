export type Signer = {
  sign(
    digest: Uint8Array<ArrayBuffer>,
  ): { r: bigint; s: bigint; recovery: number } | Promise<{ r: bigint; s: bigint; recovery: number }>;
};
