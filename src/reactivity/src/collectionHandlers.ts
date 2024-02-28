import { ReactiveFlags, TriggerType } from './constants';
import { ITERATE_KEY, reactive } from './reactive';
import { track, trigger } from './reactiveEffects';

const wrap = (val: unknown) =>
  typeof val === 'object' && val !== null ? reactive(val) : val;

// ts 中 this 的类型可以显式指定
function valueIteratorMethod(this: any) {
  const target = this[ReactiveFlags.RAW];
  const res = target.keys();
  track(target, ITERATE_KEY);
  return res;
}

export const mutableInstrumentations = {
  add(key: unknown) {
    const target = (this as any)[ReactiveFlags.RAW];
    // 判断是否已经存在，如果已经存在，就不需要执行 add 操作，也不需要触发 trigger
    const hadKey = target.has(key);
    if (!hadKey) {
      target.add(key);
      trigger(target, key, TriggerType.ADD);
    }
    return this;
  },
  entries() {
    const target = (this as any)[ReactiveFlags.RAW];
    const res = target.entries();
    track(target, ITERATE_KEY);
    return res;
  },
  forEach(callback: Function) {
    const target = (this as any)[ReactiveFlags.RAW];
    target.forEach((v1: unknown, v2: unknown) => {
      callback(wrap(v1), wrap(v2), this);
    });
    track(target, ITERATE_KEY);
    return undefined;
  },
  has(key: unknown) {
    const target = (this as any)[ReactiveFlags.RAW];
    const res = target.has(key);
    track(target, key);
    return res;
  },
  keys: valueIteratorMethod,
  values: valueIteratorMethod,
  delete(key: unknown) {
    const target = (this as any)[ReactiveFlags.RAW];
    // 判断是否已经存在，如果不存在，就不需要执行 delete 操作，也不需要触发 trigger
    const hadKey = target.has(key);
    if (hadKey) {
      target.delete(key);
      trigger(target, key, TriggerType.DELETE);
    }
    return this;
  },
  clear() {
    const target = (this as any)[ReactiveFlags.RAW];
    const size = target.size;
    const res = target.clear();
    // 如果是空的，则无需触发
    if (size) trigger(target, ITERATE_KEY, TriggerType.DELETE);
    return res;
  },
  set(key: unknown, value: unknown) {
    const target = (this as any)[ReactiveFlags.RAW];
    const type = target.has(key) ? TriggerType.SET : TriggerType.ADD;
    const res = target.set(key, value);
    trigger(target, key, type);
    return res;
  }
};
