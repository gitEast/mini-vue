import { effect } from '../src/effect';
import { reactive } from '../src/reactive';

describe('Map', () => {
  it('size', () => {
    const map = reactive(new Map());
    expect(map.size).toBe(0);
  });

  it('set', () => {
    const map = reactive(new Map());
    map.set('a', 1);
    expect(map.size).toBe(1);
  });

  it('entries', () => {
    const map = reactive(new Map());
    map.set('a', 1);
    expect(map.size).toBe(1);
  });
});
