# 响应系统 - 方案篇

## 一、程序基本逻辑

从想法到可操作的方案，还需要考虑使用中的各种情况。在此，我们暂时不考虑数据本身的结构，仍只使用对象类型，深入思考代码逻辑上的使用。

在书写逻辑代码时，如自增操作 `a++`、函数嵌套等都极为常见，而[想法篇](./01-thought.md)中所给出的代码，还不足以解决这些问题，需要打上补丁。

### 1.1 自增操作

> 自减、自乘、自除等情况就不再一一讲述了 。

在不确定已有代码是否满足自增操作的情况，还是让我们的单元测试登场。

#### 1.1.1 单元测试

```ts
// 暴露在外部的自增操作
it('self-incrementing', () => {
  const info = reactive({ age: 24 });
  info.age++;
  expect(info.age).toBe(25);
});
```

该测试成功通过。

```ts
// 在函数内部的自增操作
it('self-incrementing in effect', () => {
  const info = reactive({ age: 24 });
  const yearPass = vi.fn(() => {
    info.age++;
  });
  effect(yearPass);
  expect(yearPass).toHaveBeenCalledTimes(1);
  expect(info.age).toBe(25);
});
```

报错 <span style="color:#e05561;">RangeError: Maximum call stack size exceeded</span>，译为函数栈溢出，即 `yearPass` 函数调用次数过多。

#### 1.1.2 分析原因

`info.age++` 看起来难以理解为何导致函数栈溢出，但将其看作 `info.age = info.age + 1` 就好理解了。

1. 根据 `=` 运算符，先进行右边的运算 `info.age + 1`，即先对 `info` 进行读取操作获取 `age` 属性的值
2. `info.age` 读取操被 `Proxy.get` 拦截，在拦截代码中，运行 `track` 函数收集依赖—— `info.age` 与 `yearPass` 函数的对应关系，并返回 `info.age` 的值 24
   ```ts
   // Proxy.get 拦截
   get(target, key, receiver) {
     const res = (target as any)[key];
     // 收集依赖
     track(target, key);
     return res;
   }
   ```
3. 至此，`=` 右边的逻辑完成，得到值 25，赋给左边，进行 `info.age` 的设置操作
4. 该操作同样被 `Proxy.set` 拦截，触发依赖调用 `trigger` 函数，找到 `info.age` 的对应依赖函数 `yearPass`，重新调用
5. 此时，上一个 `yearPass` 函数还未完成，下一个 `yearPass` 函数就被调用，成衔尾蛇嵌套了
6. 于是导致函数栈溢出。

#### 1.1.3 解决代码

解决方案就两种：要么不 `track`，要么不 `trigger`。

- 不 `track`：
  - 我怎么知道什么时候不 `track`？自增操作不运行也不知道哇。
- 不 `trggier`
  - 关键就在于自增操作运行这一步。
  - 在 `trigger` 时，`activeEffect` 仍忠实地记录着当前运行函数 `yearPass`，触发的依赖函数，如果是 `activeEffect`，就别触发了，跳过吧。

```ts
/**
 * 触发依赖
 * @param target 对象
 * @param key 键
 */
export function trigger(target: object, key: unknown) {
  targetMap
    .get(target)
    ?.get(key)
    ?.forEach((_effect) => {
      // _effect 与 activeEffect 相同时跳过调用，以防函数嵌套导致栈溢出
      if (activeEffect === _effect) return;
      _effect();
    });
}
```

### 1.2 嵌套

废话不多说，上单元测试。

#### 1.2.1 单元测试

```ts
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
```

这个单元测试有点长，在此粗浅地概括：① 通过 `effect` 将 `nums` 的值 基于 键 赋给 `dummy`；② 通过 `reactive` 与 `effect`，`nums` 的值改变时 `dummy` 的值也随之改变。

报错 <span style="color:#e05561;">AssertionError: expected { num2: 10, num1: 4, num3: 2 } to deeply equal { num1: 4, num2: 10, num3: 7 }</span>，即 `nums.num3 = 7` 的响应失败。

#### 1.2.2 分析原因

不需将上述测试一行一行 `debug` 过去，只需执行至 `effect(parentSpy)` 即可看出原因。分析如下。

1. 前面全是赋值操作，直接进入 `effect(parentSpy)` 即可。
2. `effect` 包裹 `parentSpy`，即用全局变量 `activeEffect` 记录当前执行函数 `parentSpy`，然后执行其内部逻辑
3. `dummy.num2 = nums.num2` 中 `nums` 为 `proxy` 对象，右侧读取操作被拦截，进入 `track`，收集 `nums.num2` 与 `parentSpy` 的依赖关系
4. `effect(childSpy)` 中 `effect` 包裹 `childSpy`，全局变量 `activeEffect` 被赋值为 `childSpy`，并执行其内部逻辑
5. `dummy.num1 = nums.num1` 中，右侧读取操作被拦截，收集 `nums.num1` 与 `activeEffect`（即 `childSpy`）的依赖关系
6. `childSPy` 完成执行，`activeEffect` 置为 `null`，回到 `parentSpy` 函数的后续执行中
7. `dummy.num3 = nums.num3` 中，右侧读取操作被拦截，进入`track`，但由于 `activeEffect` 的值为 null，无法收集依赖关系
8. `parentSpy` 完成执行

以上解析可以看出，`nums.num1` 与 `nums.num2` 完成正确的依赖关系收集，但 `nums.num3` 没有成功收集依赖，因此在 `nums.num3` 的设置操作中，没有重新调用本应有的依赖函数，导致报错。

#### 1.2.3 解决代码

函数嵌套是否让你想到函数调用栈？——用栈结构来记录当前执行的函数

```ts
// 全局变量，用于记录当前运行的函数
export const activeEffectStack: Function[] = [];
export function effect(fn: Function) {
  // 入栈
  activeEffectStack.push(fn);
  fn();
  // 出栈
  activeEffectStack.pop();
}

export function track(target: object, key: unknown) {
  // 栈顶元素即为当前运行的函数
  const activeEffect = activeEffectStack[activeEffectStack.length - 1];
  // 将 activeEffect 判断条件放到最外侧，减少内部无效代码运行
  if (activeEffect) {
    let depMap = targetMap.get(target);
    if (!depMap) targetMap.set(target, (depMap = new Map()));
    let dep = depMap.get(key);
    if (!dep) depMap.set(key, (dep = new Set()));
    dep.add(activeEffect);
  }
}

/**
 * 触发依赖
 * @param target 对象
 * @param key 键
 */
export function trigger(target: object, key: unknown) {
  // 栈顶元素即为当前运行的函数
  const activeEffect = activeEffectStack[activeEffectStack.length - 1];
  targetMap
    .get(target)
    ?.get(key)
    ?.forEach((_effect) => {
      // _effect 与 activeEffect 相同时跳过调用，以防函数嵌套导致栈溢出
      if (activeEffect === _effect) return;
      _effect();
    });
}
```

其实该单元测试有些取巧，如果外部函数的依赖收集在内部函数执行之前，那就无法发现该问题（且看 `dummy.num2 = nums.num2` 的响应就完全正确）。

### 1.3 分支情况

> 聪明的朋友已经发现 1.1 - 1.3 与流程控制的关系了，一一对应，循环、嵌套、分支。而分支放在最后，不是因为在分支情况下，已有的代码会出错，而是因为这已经进入优化阶段，属于 next level 了。

#### 1.3.1 单元测试

```ts
it('分支情况下不必要的更新', () => {
  let isShow = true;
  const info = reactive({ age: 24 });
  const getAge = vi.fn(() => (isShow ? info.age : '?'));
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
```

在上述分支情况下，当 `isShow` 为 `false` 时，`getAge` 已不关心 `info.age` 是否改变，而永远返回 `'?'` 了。

#### 1.3.2 解决代码

重新收集依赖。

如果每一次的依赖都是重新收集过的，就无需担心沉积的不合时宜的依赖了（something like 死缠烂打的前任）。

正如进入下一段感情之前把上一段感情收拾得干干净净，而每一次调用函数都经历先收集依赖然后等待依赖值改变触发触发依赖，因此在收集依赖之前，需要清空之前的依赖。——即，完成上一轮的 `trigger` 且清空这些函数对应的依赖关系。

如果不改变 `activeEffect` 的数据结构，需要根据值来求键一次次遍历找出对应的键值对关系然后清除，未免麻烦。不妨以类的实例来包裹 `activeEffect`，在绑定依赖关系时就挂载对应的数据。

```ts
export function effect(fn: Function) {
  new ReactiveEffect(fn);
}

/**
 * 用于包裹当前运行函数
 */
export class ReactiveEffect {
  private _fn;
  // 用于记录该函数建立的依赖关系
  public deps: Set<Dep> = new Set();

  constructor(fn: Function) {
    this._fn = fn;
    this.run();
  }

  // 运行并记录函数，原 effect 函数逻辑
  run() {
    activeEffectStack.push(this);
    this._fn();
    activeEffectStack.pop();
  }
}

/**
 * 清除某个函数对应的依赖关系
 * @param effect 函数的包裹对象值
 */
export function cleanup(effect: ReactiveEffect) {
  if (effect.deps.size) {
    effect.deps.forEach((dep) => dep.delete(effect));
    effect.deps = new Set();
  }
}

export function track(target: object, key: unknown) {
  // 栈顶元素即为当前运行的函数
  const activeEffect = activeEffectStack[activeEffectStack.length - 1];
  // 将 activeEffect 判断条件放到最外侧，减少内部无效代码运行
  if (activeEffect) {
    let depMap = targetMap.get(target);
    if (!depMap) targetMap.set(target, (depMap = new Map()));
    let dep = depMap.get(key);
    if (!dep) depMap.set(key, (dep = new Set()));
    dep.add(activeEffect);
    // 记录依赖关系的 Set<ReactiveEffect>，清除时只需从中 delete 即可
    activeEffect.deps.add(dep);
  }
}

/**
 * 触发依赖
 * @param target 对象
 * @param key 键
 */
export function trigger(target: object, key: unknown) {
  // 栈顶元素即为当前运行的函数
  const activeEffect = activeEffectStack[activeEffectStack.length - 1];
  // 记录将要触发的副作用函数，以防 cleanup 和 再次运行时的 track 导致 Set 结构去除函数又加入该函数 => 不断再次运行该函数
  const effectsToRun = new Set(targetMap.get(target)?.get(key));
  effectsToRun.forEach((_effect) => {
    // _effect 与 activeEffect 相同时跳过调用，以防函数嵌套导致栈溢出
    if (activeEffect === _effect) return;
    cleanup(_effect);
    _effect.run();
  });
}
```

此处有一个小知识点：当 `Set` 对象中一个函数元素被 `delete` 后又 `add` 进来，该函数元素在 `forEach` 中会被再次调用（如果 `forEach` 没有结束的话）。

[MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach#description):
**_Each value is visited once, except in the case when it was deleted and re-added before forEach() has finished. callback is not invoked for values deleted before being visited. New values added before forEach() has finished will be visited._**
