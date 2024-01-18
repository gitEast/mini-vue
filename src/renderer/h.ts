import { Child, VnodeTag, IProps, IVnode } from './type';

function h(tag: VnodeTag, props?: IProps, children?: Child[]): IVnode {
  return {
    tag,
    props: props || {},
    children: children || []
  };
}

export default h;
