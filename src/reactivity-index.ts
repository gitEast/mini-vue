/**
 * 响应系统测试代码
 */
import render from './renderer';
import h from './renderer/h';
import reactivity from './reactivity';
import { effect } from './reactivity';
import computed from './reactivity/computed';
import { IEffectFn } from './reactivity/type';
import oneUpdate from './reactivity/oneUpdate';
import watch from './reactivity/watch';

/** 响应系统的测试代码 */
/*
// 案例 1. 设计一个对象，追踪年龄
// let age = 24;
// let isShowAge = true;
const personObj = {
  name: 'Crocodile',
  age: 24
  // isShowAge: true
};
const person = reactivity(personObj);

const container = document.getElementById('root')!;
const vnode = h('div', {}, [
  h('div', {}, ['我今年', h('span', { id: 'myAge' }, []), '岁']),
  // h('div', {}, ['她今年', h('span', { id: 'herAge' }, []), '岁']),
  // h(
  //   'button',
  //   {
  //     onClick() {
  //       isShowAge = !isShowAge;
  //       person.isShowAge = isShowAge;
  //     }
  //   },
  //   ['不显示年龄']
  // ),
  h(
    'button',
    {
      onClick() {
        person.age++;
      }
    },
    ['过去了一年']
  )
  // h('div', {}, ['我的名字是', h('span', { id: 'myName' }, [])]),
  // h(
  //   'button',
  //   {
  //     onClick() {
  //       person.name = 'East';
  //     }
  //   },
  //   ['改个名字']
  // )
]);
render(vnode, container);

const myAgeEl = document.getElementById('myAge')!;
// const herAgeEl = document.getElementById('herAge')!;
// const myNameEl = document.getElementById('myName')!;

// 案例 2. 使用了该值的函数
function showYourAge() {
  // effect(showMyName);
  // myAgeEl.innerText = person.isShowAge ? `${person.age}` : '？';
}
// function showHerAge() {
//   herAgeEl.innerText = `${person.age + 20}`;
// }

// function showMyName() {
//   myNameEl.innerText = person.name;
// }

effect(showYourAge);
// effect(showHerAge);
// effect(showMyName);

effect(() => {
  person.age++;
  myAgeEl.innerText = `${person.age}`;
});
*/

/** 其他功能的测试代码 */
const person = reactivity({
  age: 24,
  ageBase: 20
});

// 1. 只更新一次
// oneUpdate(() => {
//   console.log(person.age);
// });

// 2. computed
// let count = 0;
// const momAge = computed(() => {
//   const res = person.age + person.ageBase;
//   console.log(`妈妈的年龄计算了${++count}次`);
//   return res;
// });

// 3. watch
// watch(person, () => {
//   console.log(`我的信息发生了变化：age ${person.age}`);
// });
// watch(
//   () => person.age,
//   (newVal, oldVal) => {
//     console.log(`我的信息发生了变化：age ${oldVal} => ${newVal}`);
//   },
//   {
//     // immediate: true,
//     flush: 'post'
//   }
// );
// person.age++;
// person.age++;
// console.log(1111);

// 4. 过期的副作用
let timer = 4000;

watch(
  () => person.age,
  (newVal, oldVal, onValidate) => {
    let isExpired = false;

    onValidate(() => (isExpired = true));

    setTimeout(() => {
      if (!isExpired) {
        console.log(`年龄发生了变化：age ${oldVal} => ${newVal}`);
      }
    }, timer);
    timer = timer - 2000;
  }
);

person.age++;
person.age++;
