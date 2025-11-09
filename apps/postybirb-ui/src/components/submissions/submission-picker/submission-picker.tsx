import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  ComboboxItem,
  Group,
  Image,
  Loader,
  MultiSelect,
} from '@mantine/core';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { IconCheck, IconFile } from '@tabler/icons-react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';
import { defaultTargetProvider } from '../../../transports/http-client';

type SubmissionPickerProps = {
  type: SubmissionType;
  value: SubmissionId[];
  onChange: (value: SubmissionId[]) => void;
};

function getSubmissionLabel(
  submission: SubmissionDto,
  label: string,
): JSX.Element {
  if (submission.type === SubmissionType.MESSAGE) {
    return <Box>{label}</Box>;
  }

  const { files } = submission;
  const src = files.length
    ? `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`
    : null;
  return (
    <Group>
      {src ? (
        <Image loading="lazy" h={40} w={40} fit="fill" src={src} />
      ) : (
        <IconFile />
      )}{' '}
      {label}
    </Group>
  );
}

export function SubmissionPicker(props: SubmissionPickerProps) {
  const { type, value, onChange } = props;
  const { t } = useLingui();
  const { state, isLoading } = useStore(SubmissionStore);
  const submissions = state.filter((submission) => submission.type === type);

  const submissionOptions: ComboboxItem[] = submissions.map((submission) => ({
    label: submission.getDefaultOptions().data.title ?? t`Unknown`,
    value: submission.id,
  }));

  if (isLoading) {
    return <Loader />;
  }

  return (
    <MultiSelect
      clearable
      required
      label={<Trans>Submissions</Trans>}
      data={submissionOptions}
      value={value}
      onChange={onChange}
      renderOption={(item) => {
        const submission = submissions.find((s) => s.id === item.option.value);
        if (!submission) {
          return undefined;
        }
        return (
          <Group>
            {item.checked ? <IconCheck /> : null}
            {getSubmissionLabel(submission, item.option.label)}
          </Group>
        );
      }}
    />
  );
}
