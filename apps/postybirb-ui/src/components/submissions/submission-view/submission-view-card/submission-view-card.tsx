import { Trans } from '@lingui/macro';
import {
    ActionIcon,
    Box,
    Button,
    Card,
    Flex,
    Group,
    Image,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
    IconCopy,
    IconEdit,
    IconSend,
    IconSquare,
    IconSquareFilled,
} from '@tabler/icons-react';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { defaultTargetProvider } from '../../../../transports/http-client';

type SubmissionViewCardProps = {
  submission: SubmissionDto;
  onSelect(submission: SubmissionDto): void;
  isSelected: boolean;
};

export function SubmissionViewCard(props: SubmissionViewCardProps) {
  const { submission, onSelect, isSelected } = props;
  const { type } = submission;
  const { files } = submission;
  const src = files.length
    ? `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`
    : null;
  return (
    <Card shadow="xs" withBorder={isSelected}>
      <Card.Section ta="center" pt="4" bg="rgba(0,0,0,0.1)">
        <Flex>
          <ActionIcon
            flex="6"
            c="var(--mantine-color-text)"
            variant="transparent"
            onClick={() => onSelect(submission)}
          >
            {isSelected ? <IconSquareFilled /> : <IconSquare />}
          </ActionIcon>
          <Group gap="xs">
            <Button
              size="xs"
              variant="subtle"
              c="pink"
              leftSection={<IconCopy />}
            >
              <Trans>Duplicate</Trans>
            </Button>
            <Button size="xs" variant="subtle" leftSection={<IconEdit />}>
              <Trans>Edit</Trans>
            </Button>
            <Button
              size="xs"
              variant="subtle"
              c="teal"
              leftSection={<IconSend />}
            >
              <Trans>Post</Trans>
            </Button>
          </Group>
        </Flex>
      </Card.Section>
      <Card.Section pt="4">
        <Flex>
          {type === SubmissionType.FILE && src ? (
            <Image h={75} w={75} fit="fill" src={src} />
          ) : null}
          <Box mx="xs" flex="10">
            Hi
          </Box>
        </Flex>
      </Card.Section>
    </Card>
  );
}
