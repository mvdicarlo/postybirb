import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Image, rem } from '@mantine/core';
import { Spotlight, SpotlightActionData } from '@mantine/spotlight';
import { SubmissionType } from '@postybirb/types';
import {
  IconFile,
  IconHome,
  IconMessage,
  IconSearch,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import {
  EditSubmissionPath,
  FileSubmissionPath,
  HomePath,
  MessageSubmissionPath,
} from '../../pages/route-paths';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';
import { defaultTargetProvider } from '../../transports/http-client';

export function PostybirbSpotlight() {
  const { _ } = useLingui();
  const { state: submissions } = useStore(SubmissionStore);

  const navigateTo = useNavigate();
  const navigationTargets: SpotlightActionData[] = [
    {
      id: 'home',
      label: _(msg`Home`),
      leftSection: <IconHome />,
      onClick: () => navigateTo(HomePath),
    },
    {
      id: 'file-submissions',
      label: _(msg`Post a file`),
      leftSection: <IconFile />,
      onClick: () => navigateTo(FileSubmissionPath),
    },
    {
      id: 'message-submissions',
      label: _(msg`Post a message`),
      leftSection: <IconMessage />,
      onClick: () => navigateTo(MessageSubmissionPath),
    },
  ];

  const submissionOptions: SpotlightActionData[] = submissions.map((s) => {
    const isFileType = s.type === SubmissionType.FILE;
    const { files } = s;
    const src = files.length
      ? `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`
      : null;
    const sub: SpotlightActionData = {
      group: isFileType
        ? _(msg`File submissions`)
        : _(msg`Message submissions`),
      id: s.id,
      label: s.getDefaultOptions()?.data.title || _(msg`Unknown submission`),
      // eslint-disable-next-line no-nested-ternary
      leftSection: isFileType ? (
        src ? (
          <Image loading="lazy" h={40} w={40} fit="fill" src={src} />
        ) : (
          <IconFile />
        )
      ) : (
        <IconMessage />
      ),
      onClick: () => navigateTo(`${EditSubmissionPath}/${s.id}`),
    };

    return sub;
  });

  return (
    <Spotlight
      actions={[...navigationTargets, ...submissionOptions]}
      nothingFound={<Trans>No results</Trans>}
      highlightQuery
      searchProps={{
        leftSection: (
          <IconSearch
            style={{ width: rem(20), height: rem(20) }}
            stroke={1.5}
          />
        ),
      }}
    />
  );
}
