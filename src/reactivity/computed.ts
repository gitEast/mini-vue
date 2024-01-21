import { effect, track, trigger } from '.';

function computed(computedFn: Function) {
  let value;
  let isDirty = true;
  const effectFn = effect(computedFn, {
    lazy: true,
    scheduler() {
      if (!isDirty) {
        isDirty = true;
        trigger('value', obj);
      }
    }
  });

  const obj = {
    get value() {
      if (isDirty) {
        isDirty = false;
        value = effectFn();
      }
      track('value', this);
      return value;
    }
  };

  return obj;
}

export default computed;
