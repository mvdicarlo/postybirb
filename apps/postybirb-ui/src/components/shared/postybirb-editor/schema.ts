import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core';
import { HR } from './custom/hr';
import { InlineUsernameShortcut } from './custom/username-shortcut';

const getModifiedBlockSpecs = () => {
  const blockSpecs = {
    ...defaultBlockSpecs,
    hr: HR,
  };

  delete (blockSpecs as Partial<typeof blockSpecs>).table;
  delete (blockSpecs as Partial<typeof blockSpecs>).image;

  return blockSpecs;
};

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...getModifiedBlockSpecs(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    username: InlineUsernameShortcut,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
  },
});
