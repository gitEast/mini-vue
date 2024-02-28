import { hasOwnProperty } from '../../shared';
import { ReactiveFlags, TriggerType } from './constants';
import { track, trigger } from './reactiveEffects';
import { arrayInstrumentations } from './baseHandlers';
import { mutableInstrumentations } from './collectionHandlers';

// 记录已有的 Proxy 对象: 无需强连接
export const reactiveMap = new WeakMap();
// 对象中 key 变化的依赖函数的键
export const ITERATE_KEY = Symbol();

export function reactive<T extends object>(target: T): T;
/**
 * 返回 target 的代理对象
 * @param target 对象
 * @returns 对象的代理
 */
export function reactive(target: object) {
  // 如果 target 已经有其对应的 Proxy 对象，则返回已有的
  // 如果不存在，则新建，并将 target 与 Proxy 对象的关系存入 reactiveMap 中
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;
  let proxy = createReactive(target);
  reactiveMap.set(target, proxy);
  return proxy;
}

/**
 * 创建新的代理对象
 * @param target 对象
 * @returns 对象的代理
 */
function createReactive(target: object) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 响应对象
      if (key === ReactiveFlags.IS_REACTIVE) return true;
      // 源
      if (key === ReactiveFlags.RAW) return target;
      let res;
      // 由于判断分支过多，抽取trackKey
      let trackKey: any = key;
      // 重写的数组方法
      if (Array.isArray(target) && hasOwnProperty(arrayInstrumentations, key)) {
        res = Reflect.get(arrayInstrumentations, key, target);
      } else if (target instanceof Set || target instanceof Map) {
        // 对 Set 对象的兼容：size, add, ...
        if (hasOwnProperty(mutableInstrumentations, key)) {
          // 重写的 Set 方法
          res = Reflect.get(mutableInstrumentations, key, target);
        } else {
          res = Reflect.get(target, key, target);
          if (key === 'size') {
            trackKey = ITERATE_KEY;
          }
        }
      } else {
        res = Reflect.get(target, key, receiver);
      }
      // 收集依赖
      track(target, trackKey);
      // typeof null === 'object'
      if (typeof res === 'object' && res !== null) return reactive(res);
      return res;
    },
    set(target, key, newValue, receiver) {
      // 修改 or 新增
      let type = hasOwnProperty(target, key)
        ? TriggerType.SET
        : TriggerType.ADD;
      // Array 对象较为特殊，修改 length 属性也会导致数组新增 or 删除元素
      if (Array.isArray(target) && key === 'length') {
        const oldLength = Reflect.get(target, key, receiver);
        if (oldLength > newValue) type = TriggerType.DELETE;
        else if (oldLength < newValue) type = TriggerType.ADD;
      }
      const res = Reflect.set(target, key, newValue, receiver);
      // 触发依赖
      trigger(target, key, type);
      return res;
    },
    // in 操作符拦截
    has(target, key) {
      const res = Reflect.has(target, key);
      track(target, key);
      return res;
    },
    // 删除操作拦截
    deleteProperty(target, key) {
      // 不存在该键时直接返回
      if (!hasOwnProperty(target, key)) return true;
      const res = Reflect.deleteProperty(target, key);
      // 保证该属性确实存在且成功删除，才触发依赖函数
      res && trigger(target, key, TriggerType.DELETE);
      return res;
    },
    ownKeys(target) {
      const res = Reflect.ownKeys(target);
      // 对 Array 对象的兼容处理：键值与 length 挂钩
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
      return res;
    }
  });
}

/**
 * 判断一个对象是否是响应对象
 * @param target 需要判断的对象
 * @returns {boolean}
 */
export function isReactive(target: unknown): boolean {
  return !!(target as any)[ReactiveFlags.IS_REACTIVE];
}
