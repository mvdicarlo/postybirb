import { msg, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
    ActionIcon,
    Box,
    Button,
    Card,
    Grid,
    Group,
    Loader,
    Popover,
    Space,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { SubmissionType } from '@postybirb/types';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import submissionsApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { EditSubmissionPath } from '../../../pages/route-paths';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { useStore } from '../../../stores/use-store';

type SubmissionViewProps = {
  type: SubmissionType;
};

function isValidName(name: string): boolean {
  if (name && name.trim().length) {
    return true;
  }

  return false;
}

function createNewTemplate(name: string, type: SubmissionType) {
  return submissionsApi.create({
    name,
    type,
    isTemplate: true,
  });
}

function CreateTemplateForm(props: SubmissionViewProps): JSX.Element {
  const { type } = props;
  const [value, setValue] = useState('');
  const { _ } = useLingui();

  const create = (name: string) => {
    if (isValidName(value)) {
      createNewTemplate(name.trim(), type)
        .then(() => {
          setValue('');
          notifications.show({
            message: <Trans>Template created</Trans>,
            color: 'green',
          });
        })
        .catch((err) => {
          notifications.show({
            title: <Trans>Failed to create template</Trans>,
            message: err.message,
            color: 'red',
          });
        });
    }
  };

  return (
    <TextInput
      w="100%"
      size="md"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={value.length && !isValidName(value)}
      label={<Trans>Create Submission Template</Trans>}
      placeholder={_(msg`Enter a name for the template`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && isValidName(value)) {
          create(value);
        }
      }}
      rightSection={
        <ActionIcon
          disabled={!isValidName(value)}
          onClick={() => create(value)}
        >
          <IconPlus />
        </ActionIcon>
      }
    />
  );
}

function SubmissionTemplateViewCard({ template }: { template: SubmissionDto }) {
  const navigateTo = useNavigate();
  return (
    <Card px="xl">
      <Card.Section>
        <TextInput
          label={<Trans>Template Name</Trans>}
          defaultValue={template.getTemplateName()}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (!name) {
              return;
            }
            submissionsApi
              .updateTemplateName(template.id, {
                name,
              })
              .then(() => {
                notifications.show({
                  message: <Trans>Template name has been updated</Trans>,
                  color: 'green',
                });
              });
          }}
        />
      </Card.Section>
      <Card.Section>
        <Group>
          <Popover position="bottom" withArrow>
            <Popover.Target>
              <Tooltip label={<Trans>Delete</Trans>}>
                <ActionIcon flex="1" variant="subtle" c="red">
                  <IconTrash />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown>
              <Text c="orange" size="lg">
                <Trans>
                  Are you sure you want to delete this? This action cannot be
                  undone.
                </Trans>
              </Text>
              <Box ta="center" mt="sm">
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash />}
                  onClick={() => {
                    submissionsApi.remove([template.id]);
                  }}
                >
                  <Trans>Delete</Trans>
                </Button>
              </Box>
            </Popover.Dropdown>
          </Popover>
          <Button
            c="blue"
            leftSection={<IconEdit />}
            variant="transparent"
            onClick={() => {
              navigateTo(`${EditSubmissionPath}/${template.id}`);
            }}
          >
            <Trans>Edit</Trans>
          </Button>
        </Group>
      </Card.Section>
    </Card>
  );
}

export function SubmissionTemplateView(props: SubmissionViewProps) {
  const { type } = props;
  const { state, isLoading } = useStore(SubmissionTemplateStore);
  const templates = useMemo(
    () => state.filter((t) => t.type === type),
    [state, type]
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Box>
      <Box>
        <CreateTemplateForm type={type} />
      </Box>
      <Space h="md" />
      <Grid>
        {templates.map((template) => (
          <Grid.Col key={template.id} span={3}>
            <SubmissionTemplateViewCard template={template} />
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}
