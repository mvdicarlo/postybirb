import * as Relations from './lib/relations/relations';
import * as schemas from './lib/schemas';

const Schemas = {
  ...schemas,
  ...Relations,
};

export * from './lib/database';
export * from './lib/helper-types';
export * from './lib/schemas';
export { Schemas };

