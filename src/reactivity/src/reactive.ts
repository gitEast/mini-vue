import { track, trigger } from './reactiveEffects';

export function reactive<T extends object>(target: T): T;
/**
 * 创建代理对象
 * @param target 对象
 * @returns 对象的代理
 */
export function reactive(target: object) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = (target as any)[key];
      // 收集依赖
      track(target, key);
      return res;
    },
    set(target, key, newValue, receiver) {
      (target as any)[key] = newValue;
      // 触发依赖
      trigger(target, key);
      return true;
    }
  });
}
