export const hasOwnProperty = (target: any, key: string | symbol) =>
  Object.prototype.hasOwnProperty.call(target, key);
