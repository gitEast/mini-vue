import { activeEffect } from './effect';

// 键对应的依赖函数集合
type Dep = Set<Function>;
// 对象对应的 键值对依赖 集合
type KeyToDepMap = Map<any, Dep>;
// 使用 WeakMap 原因：弱引用，该 key(对象类型) 存在，也不妨碍其被回收
type TargetMap = WeakMap<any, KeyToDepMap>;
const targetMap: TargetMap = new WeakMap();
/**
 * 收集依赖
 * @param target 对象
 * @param key 键
 */
export function track(target: object, key: unknown) {
  let depMap = targetMap.get(target);
  if (!depMap) targetMap.set(target, (depMap = new Map()));
  let dep = depMap.get(key);
  if (!dep) depMap.set(key, (dep = new Set()));
  if (activeEffect) {
    dep.add(activeEffect);
  }
}

/**
 * 触发依赖
 * @param target 对象
 * @param key 键
 */
export function trigger(target: object, key: unknown) {
  targetMap
    .get(target)
    ?.get(key)
    ?.forEach((_effect) => _effect());
}
