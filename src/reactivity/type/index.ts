export type Prop = string | symbol;
export type PropFns = Set<IEffectFn>;
export type TargetMap = Map<Prop, PropFns>;

export type Bucket = WeakMap<any, TargetMap>;

export interface IEffectFn {
  fnSets: Set<PropFns>;
  options?: IEffectOption;
  (): void;
}

export interface IEffectOption {
  scheduler?: (fn: IEffectFn) => void;
  lazy?: boolean;
}

export interface WatchOption {
  immediate?: boolean;
  flush?: 'post' | 'sync' | 'pre';
}
