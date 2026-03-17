import keccak256 from '@quentinadam/hash/keccak256';

export type InspectFn = (value: unknown, options?: unknown) => string;

const Data = /* @__PURE__ */ (() => {
  return class Data {
    readonly data: Uint8Array<ArrayBuffer>;

    constructor(data: Uint8Array<ArrayBuffer>) {
      this.data = data;
    }

    [Symbol.for('Deno.customInspect')](inspect: InspectFn, options: unknown): string {
      return this.#customInspect(inspect, options);
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: unknown, inspect: InspectFn): string {
      return this.#customInspect(inspect, options);
    }

    #customInspect(inspect: InspectFn, options: unknown): string {
      if (this.data.length === 0) {
        return inspect([], options);
      }
      let index = 4;
      const methodSignature = this.data.slice(0, index).toHex();
      const lines = [Data.decodeMethodSignature(methodSignature) ?? methodSignature];
      while (index < this.data.length) {
        lines.push(this.data.slice(index, index + 32).toHex());
        index += 32;
      }
      return inspect(lines, options);
    }

    static #method = new Map<string, string>();

    static addMethod(method: string) {
      this.#method.set(keccak256(method).slice(0, 4).toHex(), method);
    }

    static decodeMethodSignature(signature: string): string | undefined {
      return this.#method.get(signature);
    }

    static {
      const methods = [
        'approve(address,uint256)',
        'burn(address,uint256)',
        'burn(uint256)',
        'deposit()',
        'mint(address,uint256)',
        'mint(uint256)',
        'sweep()',
        'sweep(address)',
        'transfer(address,uint256)',
        'transferFrom(address,address,uint256)',
        'withdraw(uint256)',
      ];
      for (const method of methods) {
        this.addMethod(method);
      }
    }
  };
})();

export default Data;
