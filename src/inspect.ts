export type InspectFn = (value: unknown, options?: unknown) => string;
export type InspectOptions = { stylize?: ((text: string, styleType: string) => string) | undefined };
