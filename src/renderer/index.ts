import { IVnode } from './type';

/**
 * 渲染函数
 */
function render(vnode: IVnode, container: HTMLElement) {
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
      const childNode = document.createTextNode(child);
      el.appendChild(childNode);
    } else if (typeof child === 'object') {
      if (typeof child.tag === 'function') {
        render(child.tag(), el);
      } else if (typeof child.tag === 'object') {
        render(child.tag.render(), el);
      } else {
        render(child, el);
      }
    }
  }
}

export default render;
