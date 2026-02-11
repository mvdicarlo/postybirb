import { Trans } from '@lingui/react/macro';
import { Input, Loader, Textarea } from '@mantine/core';
import { ISubmissionFileDto } from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import fileSubmissionApi from '../../../../../api/file-submission.api';

type FileTextFileAltProps = {
  file: ISubmissionFileDto;
};

export function FileTextAlt(props: FileTextFileAltProps) {
  const { file } = props;
  const [text, setText] = useState('');

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

  useEffect(() => {
    if (initialText != null) {
      setText(initialText);
    }
  }, [initialText]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const save = useCallback(
    debounce(async (value: string) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fileSubmissionApi.updateAltText(file.altFileId!, value);
    }, 500),
    [file.altFileId],
  );

  if (isLoading || isFetching) {
    return <Loader />;
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
