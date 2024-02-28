# 响应系统 - 方案篇之程序基本逻辑响应数据的结构

## 一、非原始值

一言以蔽之：`typeof` 的值为 `object` 的情况。

- 键值对的对象类型 `Object`
- `Array`
- `Set`
  - `WeakSet`
- `Map`
  - `WeakMap`

### 1.1 Object

在之前的代码中，对象的值都是原始值，接下来，需要考虑更多的情况了。

#### 1.1.1 对象

> 当对象的值仍为对象时，也得是响应式的。

##### 1.1.1.1 普通对象

- 单元测试
  ```ts
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
  ```
- 代码
  ```ts
  export function reactive(target: object) {
    return new Proxy(target, {
      get(target, key, receiver) {
        const res = (target as any)[key];
        // 收集依赖
        track(target, key);
        // typeof null === 'object'
        if (typeof res === 'object' && res !== null) return reactive(res);
        return res;
      },
      set(target, key, newValue, receiver) {
        (target as any)[key] = newValue;
        // 触发依赖
        trigger(target, key);
        return true;
      }
    });
  }
  ```
- 优化

  - 引入一个 API `isReactive(): boolean`，该 API 用于判断对象是否为响应对象，而无需重复使用案例进行测试。

  ```ts
  /* 单元测试 */
  it('isReactive', () => {
    const original = {
      age: 24
    };
    const observed = reactive(original);
    expect(isReactive(original)).toBe(false);
    expect(isReactive(observed)).toBe(true);
  });

  /* 实现代码 */
  export enum ReactiveFlags {
    // 是否为响应式
    IS_REACTIVE = '__v_isReactive'
  }

  export function reactive(target: object) {
    return new Proxy(target, {
      get(target, key, receiver) {
        // 响应对象
        if (key === ReactiveFlags.IS_REACTIVE) return true;
        const res = (target as any)[key];
        // 收集依赖
        track(target, key);
        // typeof null === 'object'
        if (typeof res === 'object' && res !== null) return reactive(res);
        return res;
      },
      set(target, key, newValue, receiver) {
        (target as any)[key] = newValue;
        // 触发依赖
        trigger(target, key);
        return true;
      }
    });
  }

  /**
   * 判断一个对象是否是响应对象
   * @param target 需要判断的对象
   * @returns {boolean}
   */
  export function isReactive(target: unknown): boolean {
    return !!(target as any)[ReactiveFlags.IS_REACTIVE];
  }
  ```

##### 1.1.1.2 带函数的对象

```ts
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
```

单元测试通过，无需注意。

##### 1.1.1.3 带访问器属性的对象

- 单元测试

  ```ts
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
  ```

  - 报错：<span style="color:#e05561;">AssertionError: expected "spy" to be called 2 times, but got 1 times</span>

- 原因解析：关键在于访问器
  1. 直接进入 `effect(spay)` 这一行代码，对 `Proxy` 对象 `observed` 读取 `age` 属性，被拦截，结果为 `const res = (target as any)[key];` 这一行代码
  2. 进入 `get age()` 访问器函数，由于是 `target` 调用的访问器函数，所以 `this._age` 的 `this` 指向 `target`（即 `original`），导致该读取操作无法建立 `observed._age` 与 `spy` 的依赖关系
  3. 因此当 `observed._age` 改变时，`spy` 没有被调用
- 问题解决：修改 `this` 的指向
  - ES 6 提供了 `Reflect`，可用于解决该问题
    - [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect): **_The `Reflect` namespace object contains static methods for invoking interceptable JavaScript object internal methods. The methods are the same as those of proxy handlers._**
    - 中文译为：`Reflect` 对象提供了调用 JavaScript 对象内部方法的静态拦截方法，这些方法与 proxy handlers 一致。
  ```ts
  export function reactive(target: object) {
    return new Proxy(target, {
      get(target, key, receiver) {
        // 响应对象
        if (key === ReactiveFlags.IS_REACTIVE) return true;
        const res = Reflect.get(target, key, receiver);
        // 收集依赖
        track(target, key);
        // typeof null === 'object'
        if (typeof res === 'object' && res !== null) return reactive(res);
        return res;
      },
      set(target, key, newValue, receiver) {
        const res = Reflect.set(target, key, newValue, receiver);
        // 触发依赖
        trigger(target, key);
        return res;
      }
    });
  }
  ```
  - 既然 `get` 方法用 `Reflect.get` 改写，`set` 也保持一致。

##### 1.1.1.4 根据对象的读取操作收集函数

- 访问属性 `obj.foo`，无需再次测试，前面已经使用过无数次。
- `key in obj`: 判断对象或原型上是否存在给定的 key

  - 表现：当新增或删除该 `key` 属性时，触发对应的依赖函数
  - 单元测试

    ```ts
    it('key in obj', () => {
      const proto = { species: 'human' };
      const obj = { age: 24 };
      const parent = reactive(proto);
      const child = reactive(obj);
      Reflect.setPrototypeOf(child, parent);
      const keyAge = jest.fn(() => {
        if ('age' in child) {
          console.log('age in obj √');
        } else {
          console.log('age in obj ×');
        }
      });
      const keySpecies = jest.fn(() => {
        if ('species' in child) {
          console.log('species in obj √');
        } else {
          console.log('species in obj ×');
        }
      });
      effect(keyAge);
      effect(keySpecies);

      // 删除 child.age，keyAge 需被再次调用
      delete (child as any).age;
      expect(keyAge).toHaveBeenCalledTimes(2);
      // 删除 parent.age，keyAge 需被再次调用
      delete (parent as any).species;
      expect(keySpecies).toHaveBeenCalledTimes(2);
    });
    ```

    - 报错：`keyAge` 与 `keySpecies` 都只执行了一次。
    - 原因：`in` 操作符通过 `has` 拦截，该拦截方法并未编写，使用的是原来的逻辑，因此依赖函数只执行了一次。

  - 代码
    ```ts
    export function reactive(target: object) {
      return new Proxy(target, {
        get(target, key, receiver) {
          // 响应对象
          if (key === ReactiveFlags.IS_REACTIVE) return true;
          const res = Reflect.get(target, key, receiver);
          // 收集依赖
          track(target, key);
          // typeof null === 'object'
          if (typeof res === 'object' && res !== null) return reactive(res);
          return res;
        },
        set(target, key, newValue, receiver) {
          const res = Reflect.set(target, key, newValue, receiver);
          // 触发依赖
          trigger(target, key);
          return res;
        },
        // in 操作符拦截
        has(target, key) {
          const res = Reflect.has(target, key);
          track(target, key);
          return res;
        },
        // 删除操作拦截
        deleteProperty(target, key) {
          const res = Reflect.deleteProperty(target, key);
          trigger(target, key);
          return res;
        }
      });
    }
    ```

- `for...in...`: 遍历对象

  - 表现：当新增或删除属性时，触发对应的依赖函数
  - 单元测试
    ```ts
    it('for...in...', () => {
      const original = { name: 'Crocodile', age: 24, species: 'human' };
      const observed = reactive(original);
      const traverse = jest.fn(() => {
        const keys = [];
        for (const key in observed) {
          keys.push(key);
        }
        console.log(keys.toString());
      });
      effect(traverse);
      expect(traverse).toHaveBeenCalledTimes(1);
      delete (observed as any).species;
      expect(traverse).toHaveBeenCalledTimes(2);
      observed.species = 'human being';
      expect(traverse).toHaveBeenCalledTimes(3);
      observed.species = 'human';
      expect(traverse).toHaveBeenCalledTimes(3);
    });
    ```
    - 报错：当新增或删除属性时，`traverse` 函数没有如预期一样被再次调用。
    - 原因：`for...in...` 通过 `ownKeys` 拦截，该拦截方法并未编写，仍使用原来的逻辑，因此 `traverse` 函数没有被重复调用。
      1. `ownKeys` 的参数只有一个 `target`，不符合原有 `track` 函数要求，需对其创造一个 `key`
      2. 由于该 `key` 值需唯一，且新增与删除属性时都要调用该依赖函数，所以 `key` 值为全局变量写作 `const ITERATE_KEY = Symbol()`
      3. `key` 变化时，需要调用依赖函数
      4. `value` 变化时，无需调用依赖函数，所以需要在 `trigger` 时多传入一个参数 `type` 用于区分 新增/修改/删除 操作
  - 代码

    ```ts
    /**
     * 触发 trigger 的类型
     */
    export enum TriggerType {
      ADD = 'ADD',
      SET = 'SET',
      DELETE = 'DELETE'
    }

    // 对象中 key 变化的依赖函数的键
    export const ITERATE_KEY = Symbol();

    /**
     * 创建代理对象
     * @param target 对象
     * @returns 对象的代理
     */
    export function reactive(target: object) {
      return new Proxy(target, {
        // get...
        set(target, key, newValue, receiver) {
          // 修改 or 新增
          const type = hasOwnProperty(target, key)
            ? TriggerType.SET
            : TriggerType.ADD;
          const res = Reflect.set(target, key, newValue, receiver);
          // 触发依赖
          trigger(target, key, type);
          return res;
        },
        // has...
        // 删除操作拦截
        deleteProperty(target, key) {
          // 不存在该键时直接返回
          if (!hasOwnProperty(target, key)) return true;
          const res = Reflect.deleteProperty(target, key);
          // 保证该属性确实存在且成功删除，才触发依赖函数
          res && trigger(target, key, TriggerType.DELETE);
          return res;
        }
        // ownKeys...
      });
    }

    /**
     * 触发依赖
     * @param target 对象
     * @param key 键
     */
    export function trigger(target: object, key: unknown, type: TriggerType) {
      // 栈顶元素即为当前运行的函数
      const activeEffect = activeEffectStack[activeEffectStack.length - 1];
      // 记录将要触发的副作用函数，以防 cleanup 和 再次运行时的 track 导致 Set 结构去除函数又加入该函数 => 不断再次运行该函数
      const effectsToRun = new Set(targetMap.get(target)?.get(key));
      // 新增 or 删除属性时，需再次遍历 for...in... 依赖函数
      if (type === TriggerType.ADD || type === TriggerType.DELETE) {
        const iterateEffects = targetMap.get(target)?.get(ITERATE_KEY);
        if (iterateEffects)
          iterateEffects.forEach((_effect) => effectsToRun.add(_effect));
      }
      effectsToRun.forEach((_effect) => {
        // _effect 与 activeEffect 相同时跳过调用，以防函数嵌套导致栈溢出
        if (activeEffect === _effect) return;
        cleanup(_effect);
        _effect.run();
      });
    }
    ```

#### 1.1.2 函数

### 1.2 Array

数组的操作有许多，此处按照读取(`track`)与设置(`trigger`)操作分类。

- 读取操作
  - 索引
    - `arr[index]`
  - 长度
    - `arr.length`
  - `for...in...` 遍历
  - `for...of...` 迭代遍历
  - `arr.slice()`
  - `arr.forEach()`
  - `arr.at()`
  - `arr.entries()`
  - `arr.every()`
  - `arr.find()`
    - `arr.findIndex()`
    - `arr.findLastIndex()`
  - `arr.includes()`
  - `arr.indexOf()`
    - `arr.lastIndexOf()`
  - `arr.map()`
  - ...
- 设置操作
  - 索引 `arr[index] = 1`
  - 长度 `arr.length = 0`
  - 栈方法
    - `arr.push()`
    - `arr.pop()`
    - `arr.shift()`
    - `arr.unshift()`
  - `arr.reverse()`
  - `arr.sort()`
  - `arr.concat()`
  - ...

#### 1.2.1 读取

##### 1.2.1.1 读取-索引

- 单元测试
  ```ts
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
  ```

成功通过。

##### 1.2.1.2 读取-长度

- 单元测试
  ```ts
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
  ```
  
  - 报错：`arr[2] = 1` 时，`fn` 没有被调用。
  - 原因：对 `arr[2] = 1` 设置断点进行 debug 操作可知，触发的依赖参数为 `trigger(arr, '2', 'ADD')`，参数没有问题，但进入函数内部，获取 `iterateEffects` 时出错，`iterateEffects` 为普通对象增加 `key` 时对应的依赖函数集合，而 `Array` 对象增加 `key` 时，有其专门的 `length` 用于记录，所以此时应当获取的是依赖集合是 `targetMap.get(target?).get('length')`。
  
- 代码

  ```ts
  /**
   * 触发依赖
   * @param target 对象
   * @param key 键
   */
  export function trigger(target: object, key: unknown, type: TriggerType) {
    // 栈顶元素即为当前运行的函数
    const activeEffect = activeEffectStack[activeEffectStack.length - 1];
    // 记录将要触发的副作用函数，以防 cleanup 和 再次运行时的 track 导致 Set 结构去除函数又加入该函数 => 不断再次运行该函数
    const effectsToRun = new Set(targetMap.get(target)?.get(key));
    // 新增 or 删除属性时，需再次遍历 for...in... 依赖函数
    if (type === TriggerType.ADD || type === TriggerType.DELETE) {
      const iterateEffects = targetMap.get(target)?.get(ITERATE_KEY);
      if (iterateEffects)
        iterateEffects.forEach((_effect) => effectsToRun.add(_effect));
    }
    // 数组对象 key/value 值变化的对应依赖函数
    if (Array.isArray(target) && type === TriggerType.ADD) {
      const lengthEffects = targetMap.get(target)?.get('length');
      if (lengthEffects) {
        lengthEffects.forEach((_effect) => effectsToRun.add(_effect));
      }
    }
    effectsToRun.forEach((_effect) => {
      // _effect 与 activeEffect 相同时跳过调用，以防函数嵌套导致栈溢出
      if (activeEffect === _effect) return;
      cleanup(_effect);
      _effect.run();
    });
  }
  ```

##### 1.2.1.3 读取-forin

实际上对于 `Array` 对象，我们一般不采取 `for...in...` 遍历。

- 单元测试

  ```ts
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
  ```

  - 报错：当 `arr.length = 1` 时，`fn` 没有被调用。
  - 原因：该操作导致 `arr` 的 `key` 值发生变化，`fn` 应当被调用。但根据现有代码可知，`forin` 操作对 `key` 值追踪的响应键为 `ITERATE_KEY` 而非正确的 `length`，所以需在 `ownKeys` 的拦截中对 `Array` 对象进行兼容处理。

- 代码

  ```ts
  /**
   * 创建代理对象
   * @param target 对象
   * @returns 对象的代理
   */
  export function reactive(target: object) {
    return new Proxy(target, {
      // get(target, key, receiver) {...},
      // set(target, key, newValue, receiver) {...},
      // in 操作符拦截
      // has(target, key) {...},
      // 删除操作拦截
      // deleteProperty(target, key) {...},
      ownKeys(target) {
        const res = Reflect.ownKeys(target);
        // 对 Array 对象的兼容处理：键值与 length 挂钩
        track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
        return res;
      }
    });
  }
  ```

##### 1.2.1.4 读取-forof

Hello everyone, this is what we will use when needed to traverse an Array Object.

- 单元测试

  ```ts
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
  ```

  - 报错：当 `arr.length = 1` 时，`fn` 没有被调用。
  - 原因：`Array` 对象较为特殊，`length` 属性改变时，也会导致数组新增或删除元素，所以此时传入 `trigger` 函数的 `type` 不再是 `TriggerType.SET` 而是 `TriggerType.ADD` 或 `TriggerType.DELETE`。这样一来出现了新的问题，明明是修改 `length` 的值，这样 `length` 对应的依赖函数好像就没有被触发了。而实际上，在 `trigger` 函数内部，对于新增触发 `length` 相关依赖函数已实现，只需加上删除即可。

- 代码

  ```ts
  /**
   * 创建代理对象
   * @param target 对象
   * @returns 对象的代理
   */
  export function reactive(target: object) {
    return new Proxy(target, {
      // get(target, key, receiver) {...},
      set(target, key, newValue, receiver) {
        // 修改 or 新增
        let type = hasOwnProperty(target, key)
          ? TriggerType.SET
          : TriggerType.ADD;
        // Array 对象较为特殊，修改 length 属性也会导致数组新增 or 删除元素
        if (Array.isArray(target) && key === 'length') {
          const oldLength = Reflect.get(target, key, receiver);
          if (oldLength > newValue) type = TriggerType.DELETE;
          else if (oldLength < newValue) type = TriggerType.ADD;
        }
        const res = Reflect.set(target, key, newValue, receiver);
        // 触发依赖
        trigger(target, key, type);
        return res;
      },
      // in 操作符拦截
      // has(target, key) {...},
      // 删除操作拦截
      // deleteProperty(target, key) {...},
      // ownKeys(target) {...}
    });
  }
  
  /**
   * 触发依赖
   * @param target 对象
   * @param key 键
   */
  export function trigger(target: object, key: unknown, type: TriggerType) {
    // 栈顶元素即为当前运行的函数
    const activeEffect = activeEffectStack[activeEffectStack.length - 1];
    // 记录将要触发的副作用函数，以防 cleanup 和 再次运行时的 track 导致 Set 结构去除函数又加入该函数 => 不断再次运行该函数
    const effectsToRun = new Set(targetMap.get(target)?.get(key));
    // 对 type 的判断重复出现，因此抽取成一个变量
    const isAddOrDeleteType =
      type === TriggerType.ADD || type === TriggerType.DELETE;
    // 新增 or 删除属性时，需再次遍历 for...in... 依赖函数
    if (isAddOrDeleteType) {
      const iterateEffects = targetMap.get(target)?.get(ITERATE_KEY);
      if (iterateEffects)
        iterateEffects.forEach((_effect) => effectsToRun.add(_effect));
    }
    // 数组对象 key/value 值变化的对应依赖函数
    if (Array.isArray(target) && isAddOrDeleteType) {
      const lengthEffects = targetMap.get(target)?.get('length');
      if (lengthEffects) {
        lengthEffects.forEach((_effect) => effectsToRun.add(_effect));
      }
    }
    effectsToRun.forEach((_effect) => {
      // _effect 与 activeEffect 相同时跳过调用，以防函数嵌套导致栈溢出
      if (activeEffect === _effect) return;
      cleanup(_effect);
      _effect.run();
    });
  }
  ```

##### 1.2.1.5 读取-数组的原型方法

原型方法较多，偷懒使用《Vue.js设计与实现》中介绍的重写方法进行单元测试：`includes`, `indexOf`, `lastIndexOf`

- 单元测试

  ```ts
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
  ```

  - 报错：在【值为对象类型】的测试中，两条判断都出错。
  - 原因分析如下：（由于较为复杂，以下需按步骤阅读）
    1. 查阅 [ECMAScript 文档 23.1.3.16](https://262.ecma-international.org/#sec-array.prototype.includes) 节可知，判断返回值是否为 `true` 在于 `SameValueZero(searchElement, elementK)`
       1. `searchElement` 是传入的参数
       2. `elementK` 是遍历的数组对象，由 `Get(O, !ToString(F(k)))` 获取（反正就是 arr[index]）
    2. `searchElement` 的值已经确定，关键在于 `elementK` 的值，上述的 `O` 根据文档可知是 `this`，即 `arr`，而当 `index = 0` 时，`arr[index]` 的返回值不是 `obj` 而是基于 `obj` 创建的 `Proxy` 对象，因此 `arr.includes(obj)` 的返回值不为 `true`
    3. 但这还不能解释 `arr.includes(arr[0])` 的返回值不为 `true`。根据现有 `get` 方法拦截可知，每一次调用 `get` 方法，创建的都是基于源返回值的新 `Proxy` 对象，因此 `arr.includes(arr[0])` 的返回值为 `false`

- 解决办法：（较为复杂，所以加入思路解析）

  1. 重写 `includes` 方法
     1. 保留原有方法
     2. 查两次，第一次使用原有逻辑查询，第二次将 `arr` 替换为 `arr` 的源数据进行查询。
  2. 记录每一次创建的 `Proxy` 对象，如果已经创建过了就返回已有的，不再重新创建。

- 代码

  ```ts
  export enum ReactiveFlags {
    // 是否为响应式
    IS_REACTIVE = '__v_isReactive',
    // 源数据
    RAW = '__v_raw'
  }
  
  // 记录原有逻辑
  const originIncludes = Array.prototype.includes;
  
  export const arrayInstrumentations: Record<string, Function> = {
    includes: function (...args: unknown[]) {
      // 查两次，第一次按原本逻辑，第二次使用源数据进行查询
      let res = originIncludes.apply(this, args as any);
      if (res === false) {
        res = originIncludes.apply(this[ReactiveFlags.RAW], args as any);
      }
      return res;
    }
  };
  
  /**
   * 返回 target 的代理对象
   * @param target 对象
   * @returns 对象的代理
   */
  export function reactive(target: object) {
    // 如果 target 已经有其对应的 Proxy 对象，则返回已有的
    // 如果不存在，则新建，并将 target 与 Proxy 对象的关系存入 reactiveMap 中
    const existingProxy = reactiveMap.get(target);
    if (existingProxy) return existingProxy;
    let proxy = createReactive(target);
    reactiveMap.set(target, proxy);
    return proxy;
  }
  
  /**
   * 创建新的代理对象
   * @param target 对象
   * @returns 对象的代理
   */
  function createReactive(target: object) {
    return new Proxy(target, {
      get(target, key, receiver) {
        // 响应对象
        if (key === ReactiveFlags.IS_REACTIVE) return true;
        // 源
        if (key === ReactiveFlags.RAW) return target;
        let res;
        // 重写的数组方法
        if (Array.isArray(target) && hasOwnProperty(arrayInstrumentations, key)) {
          res = Reflect.get(arrayInstrumentations, key, target);
        } else {
          res = Reflect.get(target, key, receiver);
        }
        // 收集依赖
        track(target, key);
        // typeof null === 'object'
        if (typeof res === 'object' && res !== null) return reactive(res);
        return res;
      },
      // set(target, key, newValue, receiver) {...},
      // in 操作符拦截
      // has(target, key) {...},
      // 删除操作拦截
      // deleteProperty(target, key) {...},
      // ownKeys(target) {...}
    });
  }
  ```

- `indexOf` 与 `lastIndexof` 也同理

  ```ts
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
    return instrumentations;
  }
  
  export const arrayInstrumentations = createArrayInstrumentations();
  ```

#### 1.2.2 设置

##### 1.2.2.1 设置-索引

在上述读取案例中已经使用过。

##### 1.2.2.2 设置-长度

在上述读取案例中已经使用过。

##### 1.2.2.3 设置-数组的栈方法

栈方法包括：`push`, `pop`, `shift`, `unshift`。

- 单元测试（以 `push` 为例）

  ```ts
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
  ```

  - 报错：
    - 【push - length】中，当 `arr.push(1)` 时，`fn` 被调用了两次，总共被调用三次。
    - 【several push】中，`RangeError: Maximum call stack size exceeded`，即栈溢出
  - 原因分析
    - 【push - length】：
      1. 查阅 [ECMAScript 文档 23.1.3.23](https://262.ecma-international.org/#sec-array.prototype.push) 可知，push 操作不仅读取 `length` 属性（ `LengthOfArrayLike(O)` => `ToLength(Get(obj, 'length'))`），还设置 `length` 属性（`Set(O, 'length', F(len), true)`）。
      2. `arr` 在塞入元素时，现有代码已经确定 `length` 会改变，调用了相关依赖函数。
      3. `length` 属性被修改，再次调用相关以来函数，造成重复调用。
    - 【several push】：问题仍出在读取 `length` 属性与修改该属性上。
      1. 单个 `push` 方法调用，只会造成重复调用自身，但现有代码对此已做出控制（当 `activeEffect` 与当前要调用的响应函数相同时，跳过），不会产生问题。
      2. 但两个及以上 `push` 方法调用时，由于第一个  `push` 方法已经与 `length` 属性绑定响应关系，第二个 `push`  方法修改 `length` 属性时，再次调用第一个 `push` 方法，第一个方法修改 `length` 属性时，调用已经与 `length` 建立响应关系的第二个 `push` 方法，如此循环往复，造成栈溢出。

- 解决办法

  - 重写 `push` 方法，增加全局变量 `shouldTrack` 判断当前是否建立响应关系。

- 代码

  ```ts
  // 是否 track，默认 true
  export let shouldTrack = true;
  
  function createArrayInstrumentations() {
    const instrumentations: Record<string, Function> = {};
    // ['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {...});
  
    ['push'].forEach((key) => {
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
  ```

- `pop`, `shift`, `unshift` 也同理

  ```ts
  // 是否 track，默认 true
  export let shouldTrack = true;
  
  function createArrayInstrumentations() {
    const instrumentations: Record<string, Function> = {};
    // ['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {...});
  
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
  ```

### 1.3 Set

- 读取操作
  - `size`
  - `entries()`
  - `forEach()`
  - `has()`
  - `difference()`: 取两个 `Set` 对象的 我有你没有 元素集合
  - `intersection()`: 交集
  - `isDisjointFrom()`: 是否全然无相同元素 
  - `isSubsetOf()`: 是否为另一个  `Set` 对象的子集
  - `isSupersetOf()`: 超集
  - `keys()`
  - `values()`
  - `symmetricDifference()`: 并集 - 交集
  - `union()`: 并集
- 设置操作
  - `add()`
  - `delete()`
  - `clear()`

#### 1.3.1 读取

##### 1.3.1.1 读取-size

- 单元测试

  ```ts
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
  ```

由于 `set.size` 这个基本使用错误的出现，接下来的原因分析和解决将一一对应逐个讲解。

1. 问题一

   - 报错：在不兼容 的接收器 `#<Set>` 上调用了  `get Set.prototype.size` 方法

       ```
       Set > size
       -----
       TypeError: Method get Set.prototype.size called on incompatible receiver #<Set>
       ```

   - 原因：代理对象上没有实现 `get Set.prototype.size` 方法
   
   - 解决：现有代码中读取属性值的 `this`  是 `receiver`，将其改为 `target` 即可 
   
     ```ts
     /**
      * 创建新的代理对象
      * @param target 对象
      * @returns 对象的代理
      */
     function createReactive(target: object) {
       return new Proxy(target, {
         get(target, key, receiver) {
           // 响应对象
           if (key === ReactiveFlags.IS_REACTIVE) return true;
           // 源
           if (key === ReactiveFlags.RAW) return target;
           let res;
           // 重写的数组方法
           if (Array.isArray(target) && hasOwnProperty(arrayInstrumentations, key)) {
             res = Reflect.get(arrayInstrumentations, key, target);
           } else {
             // 对 Set 对象读取 size 属性的兼容
             if (target instanceof Set && key === 'size') {
               res = Reflect.get(target, key, target);
             } else res = Reflect.get(target, key, receiver);
           }
           // 收集依赖
           track(target, key);
           // typeof null === 'object'
           if (typeof res === 'object' && res !== null) return reactive(res);
           return res;
         },
         // set(target, key, newValue, receiver) {...},
         // in 操作符拦截
         // has(target, key) {...},
         // 删除操作拦截
         // deleteProperty(target, key) {...},
         // ownKeys(target) {...}
       });
     }
     ```

2. 问题二

   - 报错：在不兼容 的接收器 `#<Set>` 上调用了  `Set.prototype.add` 方法

     ```
     Set > size
     -----
     TypeError: Method Set.prototype.add called on incompatible receiver #<Set>
     ```

   - 原因：代理对象上没有  `Set.prototype.add` 方法

   - 解决：与问题一不同的是，函数的 `this` 是调用函数的对象，所以 `add` 方法是代理对象调用，只能重写 `add` 方法，在其内部改为使用源对象来调用 `add` 方法

   - 注意点：查阅  [ECMAScript 24.2.3.1](https://262.ecma-international.org/#sec-set.prototype.add) 可知 `add` 方法的返回值为`this`，即 `Set` 对象可进行链式调用，所以重写的 `add` 方法也需要返回代理对象（如果是源对象，则无法拦截后续方法） 

     ```ts
     export const mutableInstrumentations = {
       add(key: unknown) {
         const target = (this as any)[ReactiveFlags.RAW];
         // 判断是否已经存在，如果已经存在，就不需要执行 add 操作，也不需要触发 trigger
         const hadKey = target.has(key);
         if (!hadKey) {
           target.add(key);
           trigger(target, key, TriggerType.ADD);
         }
         return this;
       }
     };
     
     /**
      * 创建新的代理对象
      * @param target 对象
      * @returns 对象的代理
      */
     function createReactive(target: object) {
       return new Proxy(target, {
         get(target, key, receiver) {
           // 响应对象
           if (key === ReactiveFlags.IS_REACTIVE) return true;
           // 源
           if (key === ReactiveFlags.RAW) return target;
           let res;
           // 由于判断分支过多，抽取trackKey
           let trackKey: any = key;
           // 重写的数组方法
           if (Array.isArray(target) && hasOwnProperty(arrayInstrumentations, key)) {
             res = Reflect.get(arrayInstrumentations, key, target);
           } else if (target instanceof Set) {
             // 对 Set 对象的兼容：size, add, ...
             if (key === 'size') {
               res = Reflect.get(target, key, target);
               trackKey = ITERATE_KEY;
             } else if (hasOwnProperty(mutableInstrumentations, key)) {
               // 重写的 Set 方法
               res = Reflect.get(mutableInstrumentations, key, target);
             } else {
               res = Reflect.get(target, key, receiver);
             }
           } else {
             res = Reflect.get(target, key, receiver);
           }
           // 收集依赖
           track(target, trackKey);
           // typeof null === 'object'
           if (typeof res === 'object' && res !== null) return reactive(res);
           return res;
         },
         // set(target, key, newValue, receiver) {...},
         // in 操作符拦截
         // has(target, key) {...},
         // 删除操作拦截
         // deleteProperty(target, key) {...},
         // ownKeys(target) {...}
       });
     }
     ```

##### 1.3.1.2 读取-entries()

- 单元测试

  ```ts
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
  ```

  - 报错：在不兼容 的接收器 `#<Set>` 上调用了  `Set.prototype.entries` 方法

    ```
    Set > entries
    -----
    TypeError: Method Set.prototype.entries called on incompatible receiver #<Set>
    ```

  - 原因：代理对象上没有 `Set.prototype.entries` 方法

  - 解决：重写 `entries` 方法

- 思路：

- 代码

  ```ts
  export const mutableInstrumentations = {
    // add(key: unknown) {...},
    entries() {
      const target = (this as any)[ReactiveFlags.RAW];
      const res = target.entries();
      track(target, ITERATE_KEY);
      return res;
    }
  };
  ```

##### 1.3.1.3 读取-forEach()

- 单元测试

  ```ts
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
  ```

  - 报错：在不兼容 的接收器 `#<Set>` 上调用了  `Set.prototype.forEach` 方法

    ```
    Set > size
    -----
    TypeError: Method Set.prototype.forEach called on incompatible receiver #<Set>
    ```

  - 解决：重写 `forEach` 方法

- 代码：

  ```ts
  const wrap = (val: unknown) =>
    typeof val === 'object' && val !== null ? reactive(val) : val;
  
  export const mutableInstrumentations = {
    // add(key: unknown) {...},
    // entries() {...},
    forEach(callback: Function) {
      const target = (this as any)[ReactiveFlags.RAW];
      target.forEach((v1: unknown, v2: unknown) => {
        callback(wrap(v1), wrap(v2), this);
      });
      track(target, ITERATE_KEY);
      return undefined;
    }
  };
  ```

##### 1.3.1.4 读取-has()

- 单元测试

  ```ts
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
  ```

- 同理，重写 `has` 方法

  ```ts
  export const mutableInstrumentations = {
    // add(key: unknown) {...},
    // entries() {...},
    // forEach(callback: Function) {...},
    has(key: unknown) {
      const target = (this as any)[ReactiveFlags.RAW];
      const res = target.has(key);
      track(target, key);
      return res;
    }
  };
  ```

##### 1.3.1.5 读取-keys() 与 values

查阅 [ECMAScript 24.2.3.8 与 24.2.3.10](https://262.ecma-international.org/#sec-set.prototype.keys) 可知，`keys()` 方法与 `values()`  方法，都是返回 `CreateSetIterator(S, value)`

```ts
// ts 中 this 的类型可以显式指定
function valueIteratorMethod(this: any) {
  const target = this[ReactiveFlags.RAW];
  const res = target.keys();
  track(target, ITERATE_KEY);
  return res;
}

export const mutableInstrumentations = {
  // add(key: unknown) {...},
  // entries() {...},
  // forEach(callback: Function) {...},
  // has(key: unknown) {...},
  keys: valueIteratorMethod,
  values: valueIteratorMethod
};
```

##### 1.3.1.6 其他读取操作

看上去，vue3 没做重写，那就直接返回 `Set` 对象本身的方法

```ts
/**
 * 创建新的代理对象
 * @param target 对象
 * @returns 对象的代理
 */
function createReactive(target: object) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 响应对象
      if (key === ReactiveFlags.IS_REACTIVE) return true;
      // 源
      if (key === ReactiveFlags.RAW) return target;
      let res;
      // 由于判断分支过多，抽取trackKey
      let trackKey: any = key;
      // 重写的数组方法
      if (Array.isArray(target) && hasOwnProperty(arrayInstrumentations, key)) {
        res = Reflect.get(arrayInstrumentations, key, target);
      } else if (target instanceof Set) {
        // 对 Set 对象的兼容：size, add, ...
        if (key === 'size') {
          res = Reflect.get(target, key, target);
          trackKey = ITERATE_KEY;
        } else if (hasOwnProperty(mutableInstrumentations, key)) {
          // 重写的 Set 方法
          res = Reflect.get(mutableInstrumentations, key, target);
        }
      } else {
        res = Reflect.get(target, key, receiver);
      }
      // 收集依赖
      track(target, trackKey);
      // typeof null === 'object'
      if (typeof res === 'object' && res !== null) return reactive(res);
      return res;
    },
    // set(target, key, newValue, receiver) {...},
    // in 操作符拦截
    // has(target, key) {...},
    // 删除操作拦截
    // deleteProperty(target, key) {...},
    // ownKeys(target) {...}
  });
}
```

####  1.3.2 设置 

##### 1.3.2.1 设置-add()

该方法在读取   `size` 时已经实现。

##### 1.3.2.2 设置-delete()

- 单元测试

  ```ts
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
  ```

  - 报错: `TypeError: Method Set.prototype.delete called on incompatible receiver #<Set> at Proxy.delete (<anonymous>)`

- 重写注意点：

  - 确保存在再进行删除 

- 代码

  ```ts
  export const mutableInstrumentations = {
    // add(key: unknown) {...},
    // entries() {...},
    // forEach(callback: Function) {...},
    // has(key: unknown) {...},
    // keys: valueIteratorMethod,
    // values: valueIteratorMethod,
    delete(key: unknown) {
      const target = (this as any)[ReactiveFlags.RAW];
      // 判断是否已经存在，如果不存在，就不需要执行 delete 操作，也不需要触发 trigger
      const hadKey = target.has(key);
      if (hadKey) {
        target.delete(key);
        trigger(target, key, TriggerType.DELETE);
      }
      return this;
    }
  };
  ```

##### 1.3.2.3 设置-clear()

- 单元测试

  ```ts
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
  ```

- 代码

  ```ts
  export const mutableInstrumentations = {
    // add(key: unknown) {...},
    // entries() {...},
    // forEach(callback: Function) {...},
    // has(key: unknown) {...},
    // keys: valueIteratorMethod,
    // values: valueIteratorMethod,
    // delete(key: unknown) {...},
    clear() {
      const target = (this as any)[ReactiveFlags.RAW];
      const size = target.size;
      const res = target.clear();
      // 如果是空的，则无需触发
      if (size) trigger(target, ITERATE_KEY, TriggerType.DELETE);
      return res;
    }
  };
  ```

### 1.4 Map

- 读取操作
  - `size`
  - `entries`
  - `forEach`
  - `get`
  - `has`
  - `keys`
  - `values`
- 设置操作
  - `delete`
  - `set`

由于 `Map` 与 `Set` 有较多地方相似，所以 `mutableInstrumentations` 的重写多数可以复用。以下只讲不同之处。（代码中仍有上述方法的单元测试）

```ts
/* 做到复用的方法  */
/**
 * 创建新的代理对象
 * @param target 对象
 * @returns 对象的代理
 */
function createReactive(target: object) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 响应对象
      if (key === ReactiveFlags.IS_REACTIVE) return true;
      // 源
      if (key === ReactiveFlags.RAW) return target;
      let res;
      // 由于判断分支过多，抽取trackKey
      let trackKey: any = key;
      // 重写的数组方法
      if (Array.isArray(target) && hasOwnProperty(arrayInstrumentations, key)) {
        res = Reflect.get(arrayInstrumentations, key, target);
        // 下面一行是发生改变的代码
      } else if (target instanceof Set || target instanceof Map) {
        // 对 Set 对象的兼容：size, add, ...
        if (hasOwnProperty(mutableInstrumentations, key)) {
          // 重写的 Set 方法
          res = Reflect.get(mutableInstrumentations, key, target);
        } else {
          res = Reflect.get(target, key, target);
          if (key === 'size') {
            trackKey = ITERATE_KEY;
          }
        }
      } else {
        res = Reflect.get(target, key, receiver);
      }
      // 收集依赖
      track(target, trackKey);
      // typeof null === 'object'
      if (typeof res === 'object' && res !== null) return reactive(res);
      return res;
    },
    // set(target, key, newValue, receiver) {...},
    // in 操作符拦截
    // has(target, key) {...},
    // 删除操作拦截
    // deleteProperty(target, key) {...},
    // ownKeys(target) {...}
  });
}
```



#### 1.4.1  读取

##### 1.4.1.1 读取-

#### 1.4.2 设置

##### 1.4.2.1 设置-set()

实际上，对于 `Map` 对象，除去复用的兼容修改外，第一个 操作就是重写 `set` 方法。

- 单元测试

  ```ts
  it('set', () => {
      const map = reactive(new Map());
      map.set('a', 1);
      expect(map.size).toBe(1);
  });
  ```

- 代码

  ```ts
  export const mutableInstrumentations = {
    // add(key: unknown) {...},
    // entries() {...},
    // forEach(callback: Function) {...},
    // has(key: unknown) {...},
    // keys: valueIteratorMethod,
    // values: valueIteratorMethod,
    // delete(key: unknown) {...},
    // clear() {...},
    set(key: unknown, value: unknown) {
      const target = (this as any)[ReactiveFlags.RAW];
      const type = target.has(key) ? TriggerType.SET : TriggerType.ADD;
      const res = target.set(key, value);
      trigger(target, key, type);
      return res;
    }
  };
  ```

  

累了 ，不想写了，告一段落吧。