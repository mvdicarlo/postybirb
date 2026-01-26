/**
 * FileAltTextEditor - BlockNote rich text editor for TEXT file fallback content.
 * Allows editing the auto-generated HTML content of DOCX, RTF, and TXT files.
 */

import {
    BlockNoteEditor,
    BlockNoteSchema,
    defaultBlockSpecs,
    defaultInlineContentSpecs,
    defaultStyleSpecs,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import {
    DefaultReactSuggestionItem,
    SuggestionMenuController,
    getDefaultReactSlashMenuItems,
    useCreateBlockNote,
} from '@blocknote/react';
import { Trans } from '@lingui/react/macro';
import { Input, Loader, ScrollArea, useMantineColorScheme } from '@mantine/core';
import { ISubmissionFileDto } from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useEffect } from 'react';
import { useQuery } from 'react-query';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { showErrorNotification } from '../../../../../utils/notifications';
import { filterSuggestionItems } from '../../../../shared/description-editor/filter-suggestion-item';

/**
 * Get filtered slash menu items - exclude table and emoji.
 */
const getCustomSlashMenuItems = (
  editor: BlockNoteEditor
): DefaultReactSuggestionItem[] =>
  getDefaultReactSlashMenuItems(editor).filter((item) => {
    if (item.key === 'table') {
      return false;
    }
    if (item.key === 'emoji') {
      return false;
    }
    return true;
  });

interface FileAltTextEditorProps {
  file: ISubmissionFileDto;
}

/**
 * BlockNote editor for editing TEXT file fallback content.
 */
export function FileAltTextEditor({ file }: FileAltTextEditorProps) {
  const { colorScheme } = useMantineColorScheme();

  // Fetch the alt text HTML content
  const {
    data: initialHTML,
    isLoading,
    isFetching,
  } = useQuery(
    ['alt-text', file.altFileId],
    () =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fileSubmissionApi.getAltText(file.altFileId!).then((res) => res.body),
    { enabled: !!file.altFileId }
  );

  // Create BlockNote schema with limited block types
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      paragraph: defaultBlockSpecs.paragraph,
      heading: defaultBlockSpecs.heading,
      divider: defaultBlockSpecs.divider,
      audio: defaultBlockSpecs.audio,
      video: defaultBlockSpecs.video,
      image: defaultBlockSpecs.image,
      table: defaultBlockSpecs.table,
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
    },
    styleSpecs: {
      ...defaultStyleSpecs,
    },
  });

  // Create BlockNote editor instance
  const editor = useCreateBlockNote({
    initialContent: undefined,
    schema,
  }) as unknown as BlockNoteEditor;

  // Debounced save function with error notification
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useCallback(
    debounce(async () => {
      const blocks = editor.document;
      const html = await editor.blocksToHTMLLossy(blocks);
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await fileSubmissionApi.updateAltText(file.altFileId!, html);
      } catch {
        showErrorNotification(<Trans>Failed to save fallback text</Trans>);
      }
    }, 500),
    [editor, file.altFileId]
  );

  // Load initial HTML content into editor on mount
  useEffect(() => {
    async function loadInitialHTML() {
      const blocks = await editor.tryParseHTMLToBlocks(initialHTML ?? '');
      editor.replaceBlocks(editor.document, blocks);
    }
    loadInitialHTML();
  }, [editor, initialHTML]);

  if (isLoading || isFetching) {
    return <Loader size="sm" />;
  }

  return (
    <>
      <Input.Label>
        <Trans>Fallback Text</Trans>
      </Input.Label>
      <ScrollArea.Autosize mah={200}>
        <BlockNoteView
          theme={colorScheme === 'light' ? 'light' : 'dark'}
          editor={editor}
          tableHandles={false}
          slashMenu={false}
          onBlur={() => {
            onChange();
          }}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(getCustomSlashMenuItems(editor), query)
            }
          />
        </BlockNoteView>
      </ScrollArea.Autosize>
    </>
  );
}
