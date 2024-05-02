import { createReactBlockSpec } from '@blocknote/react';

export const HR = createReactBlockSpec(
  {
    type: 'hr',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => <hr />,
  }
);
