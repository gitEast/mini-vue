interface IProps {
  [key: string]: any;
}

export type FuncTag = () => IVnode;
export type ObjTag = {
  render: () => IVnode;
};
export type Child = string | IVnode;

export interface IVnode {
  tag: keyof HTMLElementTagNameMap | FuncTag | ObjTag;
  props: IProps;
  children: Child[];
}
