import type { InspectFn } from './inspect.ts';
import { MethodSignatureRegistry } from './MethodSignatureRegistry.ts';

export function createInspectableDataWrapper(bytes: Uint8Array): object {
  return new (class InspectableDataWrapper {
    readonly #bytes: Uint8Array;

    constructor(bytes: Uint8Array) {
      this.#bytes = bytes;
    }

    #customInspect(inspect: InspectFn, options: unknown): string {
      if (this.#bytes.length === 0) {
        return inspect([], options);
      }
      const selector = this.#bytes.slice(0, 4).toHex();
      const lines = [MethodSignatureRegistry.decode(selector) ?? selector];
      let index = 4;
      while (index < this.#bytes.length) {
        lines.push(this.#bytes.slice(index, index + 32).toHex());
        index += 32;
      }
      return inspect(lines, options);
    }

    [Symbol.for('Deno.customInspect')](inspect: InspectFn, options: unknown): string {
      return this.#customInspect(inspect, options);
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: unknown, inspect: InspectFn): string {
      return this.#customInspect(inspect, options);
    }
  })(bytes);
}
