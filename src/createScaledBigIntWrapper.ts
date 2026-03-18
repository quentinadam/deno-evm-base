import type { InspectFn, InspectOptions } from './inspect.ts';

export default function createScaledBigIntWrapper(value: bigint, exponent: number): object {
  return new (class ScaledBigInt {
    readonly #value;
    readonly #exponent;

    constructor(value: bigint, exponent: number) {
      this.#value = value;
      this.#exponent = exponent;
    }

    [Symbol.for('Deno.customInspect')](inspect: InspectFn, options: unknown): string {
      return this.#customInspect(inspect, options);
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: unknown, inspect: InspectFn): string {
      return this.#customInspect(inspect, options);
    }

    toString() {
      return ((string) => {
        return string.slice(0, -this.#exponent) + '.' + string.slice(-this.#exponent);
      })(this.#value.toString().padStart(this.#exponent + 1, '0')).replace(/\.?0+$/, '') + 'e' + this.#exponent;
    }

    #customInspect(inspect: InspectFn, options: unknown): string {
      const stylize = (options as InspectOptions).stylize;
      if (typeof stylize === 'function') {
        return stylize(this.toString(), 'number');
      }
      const coloredNumber = inspect(0, options);
      // deno-lint-ignore no-control-regex
      const start = coloredNumber.match(/^\x1b\[[0-9;]*m/)?.[0] ?? '';
      // deno-lint-ignore no-control-regex
      const end = coloredNumber.match(/\x1b\[[0-9;]*m$/)?.[0] ?? '';
      return `${start}${this.toString()}${end}`;
    }
  })(value, exponent);
}
