import { keccak256 } from '@quentinadam/hash/keccak256';

export class MethodSignatureRegistry {
  static #methods = new Map<string, string>();

  static register(method: string) {
    this.#methods.set(keccak256(method).slice(0, 4).toHex(), method);
  }

  static decode(selector: string): string | undefined {
    return this.#methods.get(selector);
  }

  static {
    /* @__PURE__ */ (() => {
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
        this.register(method);
      }
    })();
  }
}
