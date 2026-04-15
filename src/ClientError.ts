export class ClientError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor({ message, code, data }: { message: string; code: number; data: unknown }) {
    super(data === undefined ? message : `${message} (${JSON.stringify(data)})`);
    this.code = code;
    this.data = data;
  }
}
