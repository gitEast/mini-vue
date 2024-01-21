/**
 * 多次修改，无中间状态，只进行一次更新
 */

import { IEffectFn } from './type';
import { effect } from '.';

function oneUpdate(fn: Function) {
  const jobQueue = new Set<IEffectFn>();
  let isFlush = false;
  function flushJob() {
    if (isFlush) return;
    isFlush = true;
    Promise.resolve()
      .then(() => {
        jobQueue.forEach((fn) => fn());
      })
      .finally(() => (isFlush = false));
  }

  effect(fn, {
    scheduler(fn) {
      jobQueue.add(fn);
      flushJob();
    }
  });
}

export default oneUpdate;
