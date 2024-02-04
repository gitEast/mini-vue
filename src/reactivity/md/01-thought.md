# 响应系统 - 想法篇

## 一、目的

> 出现的原因。

写多了原生 JavaScript 或 jQuery 的朋友，一定饱受数据控制的痛苦——初始化时，要将数据放入 DOM 元素中；数据变化时，要更新 DOM 元素的显示；该数据不显示时，要移除对应的 DOM 元素...做那个挖坑的人倒也罢了，只管写下去便是，思路顺畅得很（别过段日子改需求）；后来者碰到，可真是个天坑，代码规范有注释的还能快速上手，自成一派的分析逻辑定位元素都得费好大一番功夫——一个文件几千上万行代码/(ㄒ o ㄒ)/~~。

——体面人的讲法：心智负担较大。

如果有一个框架，不需要你来深思熟虑数据变化时的 DOM 更新逻辑，只管专注于数据，嘿，怪爽的。

如果有不熟悉原生或 jQuery 的朋友不太了解这个好处，可以一看下面的例子。（深受其害的就不用再看一次了，以免再次受伤。）

```html
<body>
  <span id="text">init</span>
</body>

<script>
  const el = document.getElementById('text');
  setTimeout(() => {
    el.text = 'Oh, no!';
  }, 5000);
</script>
```

而换做 Vue.js，就变成

```vue
<template>
  <span>{{ text }}</span>
</template>

<script setup>
const text = ref('init');
setTimeout(() => {
  text.value = 'Oh, no!';
}, 5000);
</script>
```

当然，代码量少的时候，确实没什么区别；代码量多的时候，emm，相信大家在工作中应该能遇上 233（如果没遇上的话，真羡慕呜呜呜）。

## 二、想法

一个数据，要如何操作，才能做到，它变化时，对应的模块也跟着变化？（此处暂不考虑 `String`, `Number`, `Boolean` 这些简单数据，而是考虑 `{ a: '111' }`这种对象数据。）

这种说起来有些干巴巴的，不如来一个案例：

```ts
const info = {
  name: 'Crocodile',
  age: 24
};

let momAge: number;
function getMomAge() {
  momAge = info.age + 24;
}

getMomAge();
info.age = 25;
```

由上述案例可以看到，`momAge` 与 `info.age` 产生了依赖关系，那么当 `info.age` 变为 25 时，希望 `momAge` 的值也能随之改变。

对此，ES6 推出了 `Proxy` 语法用于拦截对于对象的基本操作。[点此查看粗略解释](#proxy)

通过 `Proxy`，可以拦截 `info.age` 的读取操作 与 `info.age = 25` 的设置操作。在 `info.age = 25` 设置时，再次调用 `getMomAge` 函数，更新 `momAge` 的值。

但这里有个问题，我们如何知道 `getMomAge` 函数是 `info.age` 的依赖函数呢？ES6 可没有提供这么一个代理。不过我们可以自己创建一个代理来包裹 `getMomAge`。

```ts
// 全局变量，用于记录依赖函数
let activeEffect: Function | null = null;
function effect(fn: Function) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}
```

## 三、实现

### 3.1 创建代理对象

#### 3.1.1 创建单元测试

```ts
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
```

#### 3.1.2 读取操作的代理

需重写读取与设置操作，并保证原本逻辑完成。

```ts
export function reactive<T extends object>(target: T): T;
export function reactive(target: object) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = (target as any)[key];
      return res;
    },
    set(target, key, newValue, receiver) {
      (target as any)[key] = newValue;
      return true;
    }
  });
}
```

### 3.2 实现响应

#### 3.2.1 单元测试

```ts
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
```

#### 3.2.2 响应代码

需要考虑到：

1. 一个对象内部有多个键值对，不仅仅只有一个值拥有其对应的依赖函数
2. 存在多个对象，需考虑好其组织结构

```ts
// 全局变量，用于记录当前运行的函数
export let activeEffect: Function | null = null;
/**
 * 函数的代理
 * @param fn 运行的函数
 */
export function effect(fn: Function) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

export function reactive<T extends object>(target: T): T;
/**
 * 创建代理对象
 * @param target 对象
 * @returns 对象的代理
 */
export function reactive(target: object) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = (target as any)[key];
      // 收集依赖
      track(target, key);
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

// 键对应的依赖函数集合
type Dep = Set<Function>;
// 对象对应的 键值对依赖 集合
type KeyToDepMap = Map<any, Dep>;
// 使用 WeakMap 原因：弱引用，该 key(对象类型) 存在，也不妨碍其被回收
type TargetMap = WeakMap<any, KeyToDepMap>;
const targetMap: TargetMap = new WeakMap();
/**
 * 收集依赖
 * @param target 对象
 * @param key 键
 */
export function track(target: object, key: unknown) {
  let depMap = targetMap.get(target);
  if (!depMap) targetMap.set(target, (depMap = new Map()));
  let dep = depMap.get(key);
  if (!dep) depMap.set(key, (dep = new Set()));
  if (activeEffect) {
    dep.add(activeEffect);
  }
}

/**
 * 触发依赖
 * @param target 对象
 * @param key 键
 */
export function trigger(target: object, key: unknown) {
  targetMap
    .get(target)
    ?.get(key)
    ?.forEach((_effect) => _effect());
}
```

## 四、额外知识

### `Proxy`

[MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 定义如下：

**_The `Proxy` object enables you to create a proxy for another objet, which can intercept and redefine fundamental operations for that object._**

中文译为：`Proxy` 对象能够 为一个对象创建 拦截、重定义其基本操作的代理。
