import { IVnode } from '../type';

const Wind = {
  render(): IVnode {
    return {
      tag: 'div',
      props: { class: 'wind' },
      children: ['wind']
    };
  }
};

export default Wind;
