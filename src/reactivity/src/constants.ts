export enum ReactiveFlags {
  // 是否为响应式
  IS_REACTIVE = '__v_isReactive',
  // 源数据
  RAW = '__v_raw'
}

/**
 * 触发 trigger 的类型
 */
export enum TriggerType {
  ADD = 'ADD',
  SET = 'SET',
  DELETE = 'DELETE'
}
