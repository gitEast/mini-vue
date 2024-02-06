import { reactive } from '../src/reactive';

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
});
