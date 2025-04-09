import { msg, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Avatar, Badge, Box, rem, Text } from '@mantine/core';
import { Spotlight, SpotlightActionData } from '@mantine/spotlight';
import { SubmissionType } from '@postybirb/types';
import {
  IconFile,
  IconHome,
  IconMessage,
  IconSearch,
  IconTemplate,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import {
  EditSubmissionPath,
  FileSubmissionPath,
  HomePath,
  MessageSubmissionPath,
} from '../../../pages/route-paths';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';
import { defaultTargetProvider } from '../../../transports/http-client';
import './postybirb-spotlight.css';

export function PostybirbSpotlight() {
  const { _ } = useLingui();
  const { state: submissions } = useStore(SubmissionStore);
  const { state: templates } = useStore(SubmissionTemplateStore);

  const navigateTo = useNavigate();
  const navigationTargets: SpotlightActionData[] = [
    {
      group: _(msg`Navigation`),
      id: 'home',
      label: _(msg`Home`),
      description: _(msg`Go to the main dashboard`),
      leftSection: <IconHome size={24} stroke={1.5} />,
      onClick: () => navigateTo(HomePath),
    },
    {
      group: _(msg`Navigation`),
      id: 'file-submissions',
      label: _(msg`Post a file`),
      description: _(msg`Create a new file submission`),
      leftSection: <IconFile size={24} stroke={1.5} />,
      onClick: () => navigateTo(FileSubmissionPath),
    },
    {
      group: _(msg`Navigation`),
      id: 'message-submissions',
      label: _(msg`Post a message`),
      description: _(msg`Create a new message submission`),
      leftSection: <IconMessage size={24} stroke={1.5} />,
      onClick: () => navigateTo(MessageSubmissionPath),
    },
  ];

  const submissionOptions: SpotlightActionData[] = submissions.map((s) => {
    const isFileType = s.type === SubmissionType.FILE;
    const { files } = s;
    const src = files.length
      ? `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`
      : null;
    const title =
      s.getDefaultOptions()?.data.title || _(msg`Unknown submission`);

    // eslint-disable-next-line no-nested-ternary
    const leftSection = isFileType ? (
      src ? (
        <Avatar src={src} size={40} radius="sm" />
      ) : (
        <Avatar radius="sm" size={40} color="blue">
          <IconFile size={24} />
        </Avatar>
      )
    ) : (
      <Avatar radius="sm" size={40} color="green">
        <IconMessage size={24} />
      </Avatar>
    );

    return {
      group: isFileType
        ? _(msg`File submissions`)
        : _(msg`Message submissions`),
      id: s.id,
      label: title,
      description: isFileType
        ? _(msg`Edit file submission`)
        : _(msg`Edit message submission`),
      rightSection: (
        <Badge size="sm" variant="light" color={isFileType ? 'blue' : 'green'}>
          {isFileType ? <Trans>File</Trans> : <Trans>Message</Trans>}
        </Badge>
      ),
      leftSection,
      onClick: () => navigateTo(`${EditSubmissionPath}/${s.id}`),
    };
  });

  const templateOptions: SpotlightActionData[] = templates.map((t) => {
    const isFileType = t.type === SubmissionType.FILE;
    return {
      group: _(msg`Submission templates`),
      id: t.id,
      label: t.getTemplateName(),
      description: _(msg`Use this template for a new submission`),
      rightSection: (
        <Badge size="sm" variant="light" color={isFileType ? 'cyan' : 'teal'}>
          <Trans>Template</Trans>
        </Badge>
      ),
      leftSection: (
        <Avatar radius="sm" size={40} color={isFileType ? 'cyan' : 'teal'}>
          <IconTemplate size={24} />
        </Avatar>
      ),
      onClick: () => navigateTo(`${EditSubmissionPath}/${t.id}`),
    };
  });

  return (
    <Spotlight
      actions={[...navigationTargets, ...submissionOptions, ...templateOptions]}
      nothingFound={
        <Box py="lg" ta="center">
          <Text c="dimmed" fz="sm">
            <Trans>No results found</Trans>
          </Text>
        </Box>
      }
      highlightQuery
      searchProps={{
        placeholder: _(msg`Search for submissions, templates, or actions...`),
        leftSection: (
          <IconSearch
            style={{ width: rem(20), height: rem(20) }}
            stroke={1.5}
          />
        ),
      }}
      classNames={{
        actionsGroup: 'spotlight-actions-group',
        action: 'spotlight-action',
      }}
      transitionProps={{
        transition: 'pop',
        duration: 200,
      }}
    />
  );
}
