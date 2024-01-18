import { IVnode } from '../type';

const Crocodile = function (): IVnode {
  return {
    tag: 'div',
    props: {},
    children: [
      {
        tag: 'div',
        props: {
          class: 'head'
        },
        children: ['head']
      },
      {
        tag: 'div',
        props: {
          class: 'body'
        },
        children: [
          'body',
          {
            tag: 'button',
            props: {
              onClick: function () {
                console.log('clicked the button');
              }
            },
            children: ['click me']
          }
        ]
      }
    ]
  };
};

export default Crocodile;
