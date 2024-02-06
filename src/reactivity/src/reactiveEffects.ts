import { ReactiveEffect, activeEffectStack, cleanup } from './effect';

// 键对应的依赖函数集合
export type Dep = Set<ReactiveEffect>;
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
  // 栈顶元素即为当前运行的函数
  const activeEffect = activeEffectStack[activeEffectStack.length - 1];
  // 将 activeEffect 判断条件放到最外侧，减少内部无效代码运行
  if (activeEffect) {
    let depMap = targetMap.get(target);
    if (!depMap) targetMap.set(target, (depMap = new Map()));
    let dep = depMap.get(key);
    if (!dep) depMap.set(key, (dep = new Set()));
    dep.add(activeEffect);
    // 记录依赖关系的 Set<ReactiveEffect>，清除时只需从中 delete 即可
    activeEffect.deps.add(dep);
  }
}

/**
 * 触发依赖
 * @param target 对象
 * @param key 键
 */
export function trigger(target: object, key: unknown) {
  // 栈顶元素即为当前运行的函数
  const activeEffect = activeEffectStack[activeEffectStack.length - 1];
  // 记录将要触发的副作用函数，以防 cleanup 和 再次运行时的 track 导致 Set 结构去除函数又加入该函数 => 不断再次运行该函数
  const effectsToRun = new Set(targetMap.get(target)?.get(key));
  effectsToRun.forEach((_effect) => {
    // _effect 与 activeEffect 相同时跳过调用，以防函数嵌套导致栈溢出
    if (activeEffect === _effect) return;
    cleanup(_effect);
    _effect.run();
  });
}
