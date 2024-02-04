import { effect } from '../src/effect';
import { reactive } from '../src/reactive';

describe('reactivity/effect', () => {
  it('effect', () => {
    const info = reactive({
      name: 'Crocodile',
      age: 24
    });

    // 观测的值
    let momAge: number = 0;
    // 以 vi.fn 包裹函数，能监测到其是否被调用与调用的次数
    const getMomAge = vi.fn(() => {
      momAge = info.age + 20;
    });

    // effect 作用下，函数需调用一次
    effect(getMomAge);
    expect(getMomAge).toHaveBeenCalledTimes(1);
    // info.age 改变，依赖函数 getMomAge 也需再次调用更新 momAge
    info.age = 25;
    expect(getMomAge).toHaveBeenCalledTimes(2);
    expect(momAge).toBe(45);
  });
});
