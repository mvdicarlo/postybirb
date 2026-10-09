/**
 * FileAltTextEditor - Plain text editor for TEXT file fallback content.
 * Allows editing the auto-generated text content of DOCX, RTF, and TXT files.
 */

import { Trans } from '@lingui/react/macro';
import { Input, Loader, Textarea } from '@mantine/core';
import { ISubmissionFileDto } from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import fileSubmissionApi from '../../../../../api/file-submission.api';
import { showErrorNotification } from '../../../../../utils/notifications';

interface FileAltTextEditorProps {
  file: ISubmissionFileDto;
}

/**
 * Plain textarea editor for editing TEXT file fallback content.
 */
export function FileAltTextEditor({ file }: FileAltTextEditorProps) {
  const [text, setText] = useState('');

  // Fetch the alt text content
  const {
    data: initialText,
    isLoading,
    isFetching,
  } = useQuery(
    ['alt-text', file.altFileId],
    () =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fileSubmissionApi.getAltText(file.altFileId!).then((res) => res.body),
    { enabled: !!file.altFileId },
  );

  // Seed local state when fetched data arrives
  useEffect(() => {
    if (initialText != null) {
      setText(initialText);
    }
  }, [initialText]);

  // Debounced save function with error notification
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const save = useCallback(
    debounce(async (value: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await fileSubmissionApi.updateAltText(file.altFileId!, value);
      } catch {
        showErrorNotification(<Trans>Failed to save fallback text</Trans>);
      }
    }, 500),
    [file.altFileId],
  );

  if (isLoading || isFetching) {
    return <Loader size="sm" />;
  }

  return (
    <>
      <Input.Label>
        <Trans>Fallback Text</Trans>
      </Input.Label>
      <Textarea
        value={text}
        onChange={(e) => {
          const val = e.currentTarget.value;
          setText(val);
          save(val);
        }}
        autosize
        minRows={3}
        maxRows={10}
      />
    </>
  );
}
