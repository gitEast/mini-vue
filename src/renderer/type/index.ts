export type HTMLTag = keyof HTMLElementTagNameMap;
export type FuncTag = () => IVnode;
export type ObjTag = {
  render: () => IVnode;
};
export type ComponentTag = FuncTag | ObjTag;
export type VnodeTag = HTMLTag | ComponentTag;

export interface IProps {
  [key: string]: any;
}

export type Child = string | IVnode;

export interface IVnode {
  tag: VnodeTag;
  props: IProps;
  children: Child[];
}
export interface IHTMLVnode extends IVnode {
  tag: HTMLTag;
  props: IProps;
  children: Child[];
}
export interface IComponentVnode extends IVnode {
  tag: ComponentTag;
  props: IProps;
  children: Child[];
}
