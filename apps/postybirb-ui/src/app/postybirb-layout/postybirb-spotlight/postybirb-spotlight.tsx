import { Trans, useLingui } from '@lingui/react/macro';
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
import { CommonTranslations } from '../../../translations/common-translations';
import { defaultTargetProvider } from '../../../transports/http-client';
import './postybirb-spotlight.css';

export function PostybirbSpotlight() {
  const { t } = useLingui();
  const { state: submissions } = useStore(SubmissionStore);
  const { state: templates } = useStore(SubmissionTemplateStore);

  const unarchivedSubmissions = submissions.filter((s) => !s.isArchived);

  const navigateTo = useNavigate();
  const navigationTargets: SpotlightActionData[] = [
    {
      group: t`Navigation`,
      id: 'home',
      label: t`Home`,
      leftSection: <IconHome size={24} stroke={1.5} />,
      onClick: () => navigateTo(HomePath),
    },
    {
      group: t`Navigation`,
      id: 'file-submissions',
      label: t`Post a file`,
      leftSection: <IconFile size={24} stroke={1.5} />,
      onClick: () => navigateTo(FileSubmissionPath),
    },
    {
      group: t`Navigation`,
      id: 'message-submissions',
      label: t`Post a message`,
      leftSection: <IconMessage size={24} stroke={1.5} />,
      onClick: () => navigateTo(MessageSubmissionPath),
    },
  ];

  const submissionOptions: SpotlightActionData[] = unarchivedSubmissions.map(
    (s) => {
      const isFileType = s.type === SubmissionType.FILE;
      const { files } = s;
      const src = files.length
        ? `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`
        : null;
      const title = s.getDefaultOptions()?.data.title || t`Unknown`;

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
        group: isFileType ? t`File Submissions` : t`Message Submissions`,
        id: s.id,
        label: title,
        leftSection,
        onClick: () => navigateTo(`${EditSubmissionPath}/${s.id}`),
      };
    },
  );

  const templateOptions: SpotlightActionData[] = templates.map((template) => {
    const isFileType = template.type === SubmissionType.FILE;
    return {
      group: t`Submission Templates`,
      id: template.id,
      label: template.getTemplateName(),
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
      onClick: () => navigateTo(`${EditSubmissionPath}/${template.id}`),
    };
  });

  return (
    <Spotlight
      actions={[...navigationTargets, ...submissionOptions, ...templateOptions]}
      nothingFound={
        <Box py="lg" ta="center">
          <Text c="dimmed" fz="sm">
            <CommonTranslations.NoItemsFound />
          </Text>
        </Box>
      }
      highlightQuery
      searchProps={{
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
      transitionProps={{ transition: 'pop', duration: 200 }}
    />
  );
}
