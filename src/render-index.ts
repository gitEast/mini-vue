/**
 * renderer 渲染器的测试代码
 */

import render from './renderer';

import Crocodile from './renderer/components/crocodile';

import './css/index.less';
import Wind from './renderer/components/Wind';
import h from './renderer/h';

const container = document.getElementById('root')!;

const vnode = h('div', { class: 'abc' }, ['123', h(Crocodile), h(Wind)]);

render(vnode, container);
