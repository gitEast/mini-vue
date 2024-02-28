import { effect } from '../src/effect';
import { reactive } from '../src/reactive';

describe('Set', () => {
  it('size', () => {
    const set = reactive(new Set());
    expect(set.size).toBe(0);

    const fn = jest.fn(() => {
      console.log(set.size);
    });
    effect(fn);
    set.add(1);
    expect(set.size).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('entries', () => {
    const set = reactive(new Set([1, 2]));
    const fn = jest.fn(() => {
      for (const [key, value] of set.entries()) {
        console.log(key, value);
      }
    });
    effect(fn);

    set.add(3);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('forEach', () => {
    const set = reactive(new Set());
    const fn = jest.fn(() => {
      set.forEach((v1, v2, _this) => {
        console.log(v1, v2, _this);
      });
    });
    effect(fn);

    set.add(1).add(2);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('has', () => {
    const set = reactive(new Set());
    const fn = jest.fn(() => {
      if (set.has(0)) {
        console.log(111111);
      } else {
        console.log(2222222222222222);
      }
    });
    effect(fn);
    set.add(0);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keys', () => {
    const set = reactive(new Set([1]));
    const fn = jest.fn(() => {
      const keys = [];
      for (const key of set.keys()) {
        keys.push(key);
      }
      console.log(keys);
    });
    effect(fn);
    set.add(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('delete', () => {
    const set = reactive(new Set([1, 2, 3]));
    const fn = jest.fn(() => {
      const keys = [];
      for (const key of set.keys()) {
        keys.push(key);
      }
      console.log(keys);
    });
    effect(fn);
    set.delete(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clear', () => {
    const set = reactive(new Set([1, 2, 3]));
    const fn = jest.fn(() => {
      const keys = [];
      for (const key of set.keys()) {
        keys.push(key);
      }
      console.log(keys);
    });
    effect(fn);
    set.clear();
    expect(set.size).toBe(0);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
