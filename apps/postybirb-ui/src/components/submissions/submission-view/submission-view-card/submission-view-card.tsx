import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Image,
  ScrollArea,
  Stack,
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
import { WebsiteOptionForm } from '../../../form/website-option-form/website-option-form';
import { WebsiteSelect } from '../../../form/website-select/website-select';

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
  const defaultOption = submission.getDefaultOptions();
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
        <ScrollArea h={300}>
          <Flex>
            {type === SubmissionType.FILE && src ? (
              <Image
                h={75}
                w={75}
                fit="fill"
                src={src}
                style={{ position: 'sticky', top: 0 }}
              />
            ) : null}

            <Box mx="xs" flex="10">
              <Stack gap="xs">
                <WebsiteSelect
                  submission={submission}
                  onSelect={(selectedAccounts) => {
                    // TODO create website option with populated defaults
                    console.log('onSelect', selectedAccounts);
                  }}
                />
                {submission.options.map((options) => (
                  <WebsiteOptionForm
                    key={options.id}
                    defaultOption={defaultOption}
                    option={options}
                    type={type}
                    submission={submission}
                  />
                ))}
              </Stack>
            </Box>
          </Flex>
        </ScrollArea>
      </Card.Section>
    </Card>
  );
}
