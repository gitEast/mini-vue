import { IComponentVnode, IHTMLVnode, IVnode } from './type';

/**
 * 渲染函数
 */
function render(vnode: IVnode, container: HTMLElement) {
  if (typeof vnode.tag === 'string') {
    mountElement(vnode as IHTMLVnode, container);
  } else mountComponent(vnode as IComponentVnode, container);
}

/**
 * 挂载 HTML 标签
 */
function mountElement(vnode: IHTMLVnode, container: HTMLElement) {
  // 1. tag
  const el = document.createElement(vnode.tag as keyof HTMLElementTagNameMap);
  container.appendChild(el);

  // 2. props
  Object.entries(vnode.props).forEach(([key, value]) => {
    if (key.startsWith('on')) {
      const event = key.replace('on', '').toLowerCase();
      el.addEventListener(event, value.bind(el));
    } else {
      el.setAttribute(key, value);
    }
  });

  // 3. children
  for (const child of vnode.children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else render(child, el);
  }
}

/**
 * 挂载组件
 */
function mountComponent(vnode: IComponentVnode, container: HTMLElement) {
  if (typeof vnode.tag === 'function') {
    render(vnode.tag(), container);
  } else {
    render(vnode.tag.render(), container);
  }
}

export default render;
