import { ReactiveFlags } from './constants';

// 是否 track，默认 true
export let shouldTrack = true;

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {};
  ['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
    instrumentations[key] = function (...args: unknown[]) {
      // 记录原有逻辑
      const originMethod = (this[ReactiveFlags.RAW] as any)[key];
      let res = originMethod.apply(this, args as any);
      // res === -1: indexOf 与 lastIndexOf 找不到值时的返回值为 -1
      if (res === false || res === -1) {
        res = originMethod.apply(this[ReactiveFlags.RAW], args as any);
      }
      return res;
    };
  });

  ['push', 'pop', 'shift', 'unshift'].forEach((key) => {
    instrumentations[key] = function (...args: unknown[]) {
      shouldTrack = false;
      const originMethod = (this[ReactiveFlags.RAW] as any)[key];
      let res = originMethod.apply(this, args as any);
      shouldTrack = true;
      return res;
    };
  });
  return instrumentations;
}

export const arrayInstrumentations = createArrayInstrumentations();
