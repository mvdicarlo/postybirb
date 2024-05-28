import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { rem } from '@mantine/core';
import { Spotlight, SpotlightActionData } from '@mantine/spotlight';
import {
    IconFile,
    IconHome,
    IconMessage,
    IconSearch,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import {
    FileSubmissionPath,
    HomePath,
    MessageSubmissionPath,
} from '../../pages/route-paths';

export function PostybirbSpotlight() {
  const { _ } = useLingui();
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
  return (
    <Spotlight
      actions={[...navigationTargets]}
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
