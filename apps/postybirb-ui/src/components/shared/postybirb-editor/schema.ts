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
  delete (blockSpecs as Partial<typeof blockSpecs>).file;

  return blockSpecs;
};

const getModifiedBlockSpecsForAltText = () => {
  const blockSpecs = {
    ...defaultBlockSpecs,
  };

  delete (blockSpecs as Partial<typeof blockSpecs>).table;
  delete (blockSpecs as Partial<typeof blockSpecs>).image;
  delete (blockSpecs as Partial<typeof blockSpecs>).audio;
  delete (blockSpecs as Partial<typeof blockSpecs>).video;
  delete (blockSpecs as Partial<typeof blockSpecs>).file;

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

export const altFileSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...getModifiedBlockSpecsForAltText(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
  },
});
