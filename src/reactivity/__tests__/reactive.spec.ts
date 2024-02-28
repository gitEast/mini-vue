import { effect } from '../src/effect';
import { reactive, isReactive } from '../src/reactive';

describe('reactivity/reactive', () => {
  it('init proxy', () => {
    // 初始对象
    const original = { age: 24 };
    // 观察的 Proxy 对象
    const observed = reactive(original);
    // 初始对象与其代理的 Proxy 对象不相等
    expect(observed).not.toBe(original);
    // 代理对象的 age 值需与初始对象的值相等
    expect(observed.age).toBe(24);
    // 设置代理对象的值，需成功完成。
    observed.age = 25;
    expect(observed.age).toBe(25);
  });

  it('self-incrementing', () => {
    const info = reactive({ age: 24 });
    info.age++;
    expect(info.age).toBe(25);
  });

  it('nested object', () => {
    const original = {
      age: 24,
      friend: {
        age: 24
      }
    };
    const observed = reactive(original);
    expect(observed.friend).not.toBe(original.friend);
    expect(observed.friend.age).toBe(original.friend.age);
    observed.friend.age = 25;
    expect(observed.friend.age).toBe(25);
  });

  it('isReactive', () => {
    const original = {
      age: 24
    };
    const observed = reactive(original);
    expect(isReactive(original)).toBe(false);
    expect(isReactive(observed)).toBe(true);
  });

  it('value is a function', () => {
    const original = {
      age: 24,
      getAge() {
        console.log(this);
        return this.age;
      }
    };
    const observed = reactive(original);
    const spy = jest.fn(() => {
      console.log(observed.getAge());
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(observed.age).toBe(original.age);
    observed.age = 25;
    expect(observed.age).toBe(25);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('value is a getter', () => {
    const original = {
      _age: 24,
      get age() {
        console.log(this);
        return this._age;
      }
    };
    const observed = reactive(original);
    const spy = jest.fn(() => {
      console.log(observed.age);
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(observed.age).toBe(original.age);
    observed._age = 25;
    expect(observed.age).toBe(25);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
