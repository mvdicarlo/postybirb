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
import {
  Input,
  Loader,
  ScrollArea,
  useMantineColorScheme,
} from '@mantine/core';
import { ISubmissionFileDto } from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useEffect } from 'react';
import { useQuery } from 'react-query';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { filterSuggestionItems } from '../../../../shared/postybirb-editor/filter-suggestion-item';
import { altFileSchema } from '../../../../shared/postybirb-editor/schema';

const getCustomSlashMenuItems = (
  editor: BlockNoteEditor,
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

type FileTextFileAltProps = {
  file: ISubmissionFileDto;
};

export function FileTextAlt(props: FileTextFileAltProps) {
  const { file } = props;
  const {
    data: initialHTML,
    isLoading,
    isFetching,
  } = useQuery([], () =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fileSubmissionApi.getAltText(file.altFileId!).then((res) => res.body),
  );
  const theme = useMantineColorScheme();

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

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: undefined,
    schema: altFileSchema,
  }) as unknown as BlockNoteEditor;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useCallback(
    debounce(async () => {
      const blocks = editor.document;
      const html = await editor.blocksToHTMLLossy(blocks);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fileSubmissionApi.updateAltText(file.altFileId!, html);
    }, 500),
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
      <ScrollArea.Autosize mah={200}>
        <BlockNoteView
          theme={theme.colorScheme === 'light' ? 'light' : 'dark'}
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
