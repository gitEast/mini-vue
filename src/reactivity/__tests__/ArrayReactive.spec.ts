import { effect } from '../src/effect';
import { reactive } from '../src/reactive';

describe('array reactive object', () => {
  it('index', () => {
    const arr = reactive([0]);
    const fn = jest.fn(() => {
      console.log(arr[0]);
    });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    arr[0] = 1;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('length', () => {
    const arr = reactive([0]);
    const fn = jest.fn(() => {
      console.log(arr.length);
    });
    effect(fn);
    // 当 index >= length 时，隐式设置 length 的值
    arr[1] = 1;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('for...in...', () => {
    const arr = reactive([0]);
    const fn = jest.fn(() => {
      for (const key in arr) {
        console.log(key);
      }
    });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    arr[1] = 1;
    expect(fn).toHaveBeenCalledTimes(2);
    arr.length = 1;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('for...of...', () => {
    const arr = reactive([0]);
    const fn = jest.fn(() => {
      for (const item of arr) {
        console.log(item);
      }
    });
    effect(fn);
    arr[0] = 1;
    expect(fn).toHaveBeenCalledTimes(2);
    arr[1] = 1;
    expect(fn).toHaveBeenCalledTimes(3);
    arr.length = 1;
    expect(fn).toHaveBeenCalledTimes(4);
  });

  describe('includes', () => {
    it('值为原始数据类型', () => {
      const arr = [0, 1, 2, 3];
      expect(arr.includes(0)).toBe(true);
      expect(arr.includes(arr[0])).toBe(true);
    });

    it('值为对象类型', () => {
      const obj = {};
      const arr = reactive([obj]);
      expect(arr.includes(obj)).toBe(true);
      expect(arr.includes(arr[0])).toBe(true);
    });
  });

  it('indexOf', () => {
    const obj = {};
    const arr = reactive([obj]);
    expect(arr.indexOf(obj)).toBe(0);
    expect(arr.indexOf(arr[0])).toBe(0);
  });

  it('lastIndexOf', () => {
    const obj = {};
    const arr = reactive([obj]);
    expect(arr.lastIndexOf(obj)).toBe(0);
    expect(arr.lastIndexOf(arr[0])).toBe(0);
  });

  describe('stack methods', () => {
    describe('push', () => {
      // 隐式修改 length
      it('push - length', () => {
        const arr = reactive([0]);
        const fn = jest.fn(() => {
          console.log(arr.length);
        });
        effect(fn);
        arr.push(1);
        expect(fn).toHaveBeenCalledTimes(2);
      });

      it('several push', () => {
        const arr = reactive([0]);
        const fn1 = jest.fn(() => {
          arr.push(1);
        });
        const fn2 = jest.fn(() => {
          arr.push(2);
        });
        effect(fn1);
        effect(fn2);
      });
    });
  });
});
