// 全局变量，用于记录当前运行的函数
export let activeEffect: Function | null = null;
/**
 * 函数的代理
 * @param fn 运行的函数
 */
export function effect(fn: Function) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}
