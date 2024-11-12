import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from '@blocknote/react';
import { Trans } from '@lingui/macro';
import {
  Input,
  Loader,
  ScrollArea,
  useMantineColorScheme,
} from '@mantine/core';
import { ISubmissionFileDto } from '@postybirb/types';
import { ChangeEvent, useCallback, useEffect } from 'react';
import { useQuery } from 'react-query';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { schema } from '../../../../shared/postybirb-editor/schema';

type FileTextFileAltProps = {
  file: ISubmissionFileDto;
};

export function FileTextAlt(props: FileTextFileAltProps) {
  const { file } = props;
  const {
    data: initialHTML,
    isLoading,
    isFetching,
    refetch,
  } = useQuery([], () =>
    fileSubmissionApi
      .getAltText(file.altFile)
      .then((res) => String.fromCharCode.apply(null, res.body.data)),
  );
  const theme = useMantineColorScheme();
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: undefined,
    schema,
  }) as unknown as BlockNoteEditor;

  const htmlInputChanged = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      // Whenever the current HTML content changes, converts it to an array of
      // Block objects and replaces the editor's content with them.
      const blocks = await editor.tryParseHTMLToBlocks(e.target.value);
      editor.replaceBlocks(editor.document, blocks);
    },
    [editor],
  );

  // For initialization; on mount, convert the initial HTML to blocks and replace the default editor's content
  useEffect(() => {
    async function loadInitialHTML() {
      const blocks = await editor.tryParseHTMLToBlocks(initialHTML ?? '');
      editor.replaceBlocks(editor.document, blocks);
    }
    loadInitialHTML();
  }, [editor, initialHTML]);

  if (isLoading || isFetching) {
    return <Loader />;
  }

  return (
    <>
      <Input.Label>
        <Trans>Fallback Text</Trans>
      </Input.Label>
      <ScrollArea h={200}>
        <BlockNoteView
          theme={theme.colorScheme === 'light' ? 'light' : 'dark'}
          editor={editor}
          tableHandles={false}
          slashMenu={false}
          onChange={() => {
            // TODO - figure out the onchange event to save the alt text.
            // onChange(editor.document);
          }}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              // Gets all default slash menu items and `insertAlert` item.
              filterSuggestionItems(
                [...getDefaultReactSlashMenuItems(editor)],
                query,
              )
            }
          />
        </BlockNoteView>
      </ScrollArea>
    </>
  );
}
