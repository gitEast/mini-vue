import { Prop, Bucket, IEffectFn, IEffectOption } from './type';

const bucket: Bucket = new WeakMap();

const activeEffectStack: IEffectFn[] = [];

function cleanUp(effectFn: IEffectFn) {
  effectFn.fnSets.forEach((fnSet) => {
    fnSet.delete(effectFn);
  });
  effectFn.fnSets = new Set();
}

export function effect(fn: Function, options?: IEffectOption) {
  const effectFn: IEffectFn = () => {
    cleanUp(effectFn);
    activeEffectStack.push(effectFn);
    const res = fn();
    activeEffectStack.pop();
    return res;
  };
  effectFn.fnSets = new Set();
  effectFn.options = options;
  if (!options?.lazy) effectFn();

  return effectFn;
}

export function track(prop: Prop, target: any, effectFn?: IEffectFn) {
  const activeEffect =
    activeEffectStack[activeEffectStack.length - 1] || effectFn;
  if (activeEffect) {
    let targetMap = bucket.get(target);
    if (!targetMap) {
      targetMap = new Map();
      bucket.set(target, targetMap);
    }
    let fnSet = targetMap.get(prop);
    if (!fnSet) {
      fnSet = new Set();
      targetMap.set(prop, fnSet);
    }
    fnSet.add(activeEffect);
    activeEffect.fnSets.add(fnSet);
  }
}

export function trigger(prop: Prop, target: any) {
  const effectsToRun = new Set(bucket.get(target)?.get(prop));
  effectsToRun.forEach((fn) => {
    if (fn === activeEffectStack[activeEffectStack.length - 1]) return;
    if (fn.options?.scheduler) {
      fn.options.scheduler(fn);
    } else fn();
  });
}

function reactivity(obj: any) {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      track(prop, target);
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, newValue, receiver) {
      const res = Reflect.set(target, prop, newValue, receiver);
      trigger(prop, target);
      return res;
    }
  });
}

export default reactivity;
