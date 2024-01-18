import render from './renderer';
import { IVnode } from './renderer/type';

import Crocodile from './renderer/components/crocodile';

import './css/index.less';
import Wind from './renderer/components/Wind';

const container = document.getElementById('root')!;

const vnode: IVnode = {
  tag: 'div',
  props: { class: 'abc' },
  children: [
    '123',
    { tag: Crocodile, props: {}, children: [] },
    {
      tag: Wind,
      props: {},
      children: []
    }
  ]
};

render(vnode, container);
