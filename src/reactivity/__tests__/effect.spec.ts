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

  it('self-incrementing in effect', () => {
    const info = reactive({ age: 24 });
    const yearPass = vi.fn(() => {
      info.age++;
    });
    effect(yearPass);
    expect(yearPass).toHaveBeenCalledTimes(1);
    expect(info.age).toBe(25);
  });

  // 该案例从 vuejs/core 中拿取并调整
  it('should allow nested effects', () => {
    const nums = reactive({ num1: 0, num2: 1, num3: 2 });
    const dummy: any = {};

    // 内部嵌套的函数
    const childSpy = vi.fn(() => (dummy.num1 = nums.num1));
    // 外部函数
    const parentSpy = vi.fn(() => {
      dummy.num2 = nums.num2;
      effect(childSpy);
      dummy.num3 = nums.num3;
    });
    effect(parentSpy);

    expect(dummy).toEqual({ num1: 0, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(1);
    // this should only call the childeffect => 只有 childSpy 被调用
    nums.num1 = 4;
    expect(dummy).toEqual({ num1: 4, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(2);
    // this calls the parenteffect, which calls the childeffect once => parentSpy 与 childSpy 都会被调用
    nums.num2 = 10;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(2);
    expect(childSpy).toHaveBeenCalledTimes(3);
    // this calls the parenteffect, which calls the childeffect once => parentSpy 与 childSpy 都会被调用
    nums.num3 = 7;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 7 });
    expect(parentSpy).toHaveBeenCalledTimes(3);
    expect(childSpy).toHaveBeenCalledTimes(4);
  });

  it('分支情况下不必要的更新', () => {
    let isShow = true;
    const info = reactive({ age: 24 });
    const getAge = vi.fn(() => {
      isShow ? info.age : '?';
    });
    effect(getAge);

    expect(getAge).toHaveBeenCalledTimes(1);

    // getAge 被调用
    info.age++;
    expect(getAge).toHaveBeenCalledTimes(2);

    // getAge 被调用，然后发现 info.age 不需要它了
    isShow = false;
    info.age++;
    expect(getAge).toHaveBeenCalledTimes(3);

    // getAge 没有被调用
    info.age++;
    expect(getAge).toHaveBeenCalledTimes(3);
  });
});
