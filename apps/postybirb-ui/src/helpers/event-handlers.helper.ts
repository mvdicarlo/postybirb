import { UIEventHandler } from 'react';

export const stopEventPropagation: UIEventHandler = (event) => {
  event.stopPropagation();
};
