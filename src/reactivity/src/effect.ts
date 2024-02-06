import { Dep } from './reactiveEffects';

// 全局变量，用于记录当前运行的函数
export const activeEffectStack: ReactiveEffect[] = [];
/**
 * 函数的代理
 * @param fn 运行的函数
 */
export function effect(fn: Function) {
  new ReactiveEffect(fn);
}

/**
 * 用于包裹当前运行函数
 */
export class ReactiveEffect {
  private _fn;
  // 用于记录该函数建立的依赖关系
  public deps: Set<Dep> = new Set();

  constructor(fn: Function) {
    this._fn = fn;
    this.run();
  }

  // 运行并记录函数，原 effect 函数逻辑
  run() {
    activeEffectStack.push(this);
    this._fn();
    activeEffectStack.pop();
  }
}

/**
 * 清除某个函数对应的依赖关系
 * @param effect 函数的包裹对象值
 */
export function cleanup(effect: ReactiveEffect) {
  if (effect.deps.size) {
    effect.deps.forEach((dep) => dep.delete(effect));
    effect.deps = new Set();
  }
}
