import { effect } from '.';
import { WatchOption } from './type';

function watch(value: any, callback: Function, options?: WatchOption) {
  let getter: Function;
  let oldValue;
  let cleanUp: Function | null = null;

  if (typeof value === 'function') getter = value;
  else getter = () => traverse(value);

  function onValidate(fn: Function) {
    cleanUp = fn;
  }

  const job = () => {
    if (cleanUp) {
      cleanUp();
      cleanUp = null;
    }
    const newValue = effectFn();
    callback(newValue, oldValue, onValidate);
    oldValue = newValue;
  };

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (options?.flush === 'post') {
        Promise.resolve().then(job);
      } else job();
    }
  });

  if (options?.immediate) job();
  else oldValue = effectFn();
}

function traverse(value: any, seen?: Set<any>) {
  if (!seen) seen = new Set();
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);
  for (const key in value) {
    traverse(value[key], seen);
  }
}

export default watch;
