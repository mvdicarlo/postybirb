/* eslint-disable lingui/no-unlocalized-strings */
// Do not care to translate this file
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Radio,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { CustomAccountData } from '@postybirb/types';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import accountApi from '../../../api/account.api';
import { notifyLoginFailed } from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

interface HeaderWithId {
  id: string;
  name: string;
  value: string;
}

const formId = 'custom-login-form';
const HEADER_NAME_PLACEHOLDER = 'Header name';
const HEADER_VALUE_PLACEHOLDER = 'Header value';

export default function CustomLoginView(
  props: LoginViewProps<CustomAccountData>,
): JSX.Element {
  const { account, data, notifyLoginSuccess } = props;
  const { id } = account;

  const [headersWithIds, setHeadersWithIds] = useState<HeaderWithId[]>([]);
  const [formData, setFormData] = useState<Omit<CustomAccountData, 'headers'>>({
    descriptionField: 'description',
    descriptionType: 'html',
    fileField: 'file',
    fileUrl: '',
    notificationUrl: '',
    ratingField: 'rating',
    tagField: 'tags',
    thumbnailField: 'thumbnail',
    titleField: 'title',
    altTextField: 'alt',
  });

  // Initialize form data from props
  useEffect(() => {
    if (data) {
      const { headers, ...rest } = data;
      setFormData((prev) => ({ ...prev, ...rest }));

      if (headers) {
        setHeadersWithIds(
          headers.map((header, index) => ({
            id: `header-${Date.now()}-${index}`,
            ...header,
          })),
        );
      }
    }
  }, [data]);

  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const isFormValid =
    formData.fileUrl?.trim() || formData.notificationUrl?.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);

    try {
      // Convert headers back to original format for saving
      const headers = headersWithIds
        .filter((header) => header.name.trim() && header.value.trim())
        .map(({ name, value }) => ({ name, value }));

      const cleanedData: CustomAccountData = { ...formData, headers };

      await accountApi.setWebsiteData<CustomAccountData>({
        id,
        data: cleanedData,
      });

      notifyLoginSuccess();
    } catch (error) {
      notifyLoginFailed((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (
    field: keyof Omit<CustomAccountData, 'headers'>,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addHeader = () => {
    const newHeader: HeaderWithId = {
      id: `header-${Date.now()}-${Math.random()}`,
      name: '',
      value: '',
    };
    setHeadersWithIds((prev) => [...prev, newHeader]);
  };

  const updateHeader = (
    headerId: string,
    field: 'name' | 'value',
    value: string,
  ) => {
    setHeadersWithIds((prev) =>
      prev.map((header) =>
        header.id === headerId ? { ...header, [field]: value } : header,
      ),
    );
  };

  const removeHeader = (headerId: string) => {
    setHeadersWithIds((prev) =>
      prev.filter((header) => header.id !== headerId),
    );
  };

  return (
    <LoginViewContainer>
      <form id={formId} onSubmit={handleSubmit}>
        <Stack>
          <Alert color="blue">
            <Text>
              Configure custom webhook URLs and field mappings for your custom
              integration. You need at least one URL (File URL for file
              submissions or Notification URL for text-only posts).
            </Text>
            <br />
            <br />
            <Text>
              Custom website is for websites that you own and understand the
              actual backend of.
            </Text>
          </Alert>

          <TextInput
            label={<Text>File URL</Text>}
            description={
              <Text>The URL that will be posted to when submitting files</Text>
            }
            value={formData.fileUrl || ''}
            onChange={(event) =>
              updateFormData('fileUrl', event.currentTarget.value)
            }
            placeholder="https://your-server.com/api/files"
          />

          <TextInput
            label={<Text>Notification URL</Text>}
            description={
              <Text>
                The URL that will be posted to when submitting text-only posts
              </Text>
            }
            value={formData.notificationUrl || ''}
            onChange={(event) =>
              updateFormData('notificationUrl', event.currentTarget.value)
            }
            placeholder="https://your-server.com/api/notifications"
          />

          <Group grow>
            <TextInput
              label={<Text>Title Field</Text>}
              value={formData.titleField || ''}
              onChange={(event) =>
                updateFormData('titleField', event.currentTarget.value)
              }
            />
            <TextInput
              label={<Text>Description Field</Text>}
              value={formData.descriptionField || ''}
              onChange={(event) =>
                updateFormData('descriptionField', event.currentTarget.value)
              }
            />
          </Group>

          <Group>
            <Text size="sm" fw={500}>
              <Text>Description Type</Text>
            </Text>
            <Radio.Group
              value={formData.descriptionType || 'html'}
              onChange={(value) =>
                updateFormData('descriptionType', value || 'html')
              }
            >
              <Group>
                <Radio value="html" label="HTML" />
                <Radio value="text" label={<Text>Plain Text</Text>} />
                <Radio value="md" label={<Text>Markdown</Text>} />
                <Radio value="bbcode" label={<Text>BBCode</Text>} />
              </Group>
            </Radio.Group>
          </Group>

          <Group grow>
            <TextInput
              label={<Text>Tag Field</Text>}
              value={formData.tagField || ''}
              onChange={(event) =>
                updateFormData('tagField', event.currentTarget.value)
              }
            />
            <TextInput
              label={<Text>Rating Field</Text>}
              value={formData.ratingField || ''}
              onChange={(event) =>
                updateFormData('ratingField', event.currentTarget.value)
              }
            />
          </Group>

          <Group grow>
            <TextInput
              label={<Text>File Field</Text>}
              value={formData.fileField || ''}
              onChange={(event) =>
                updateFormData('fileField', event.currentTarget.value)
              }
            />
            <TextInput
              label={<Text>Thumbnail Field</Text>}
              value={formData.thumbnailField || ''}
              onChange={(event) =>
                updateFormData('thumbnailField', event.currentTarget.value)
              }
            />
          </Group>

          <TextInput
            label={<Text>Alt Text Field</Text>}
            value={formData.altTextField || ''}
            onChange={(event) =>
              updateFormData('altTextField', event.currentTarget.value)
            }
          />

          <Box>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>
                <Text>Headers</Text>
              </Text>
              <ActionIcon variant="light" onClick={addHeader} size="sm">
                <IconPlus size={16} />
              </ActionIcon>
            </Group>
            <Text size="xs" c="dimmed" mb="md">
              <Text>Custom headers for authentication or other purposes</Text>
            </Text>

            <Stack gap="xs">
              {headersWithIds.map((header) => (
                <Group key={header.id} align="end">
                  <TextInput
                    placeholder={HEADER_NAME_PLACEHOLDER}
                    value={header.name}
                    onChange={(event) =>
                      updateHeader(header.id, 'name', event.currentTarget.value)
                    }
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    placeholder={HEADER_VALUE_PLACEHOLDER}
                    value={header.value}
                    onChange={(event) =>
                      updateHeader(
                        header.id,
                        'value',
                        event.currentTarget.value,
                      )
                    }
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => removeHeader(header.id)}
                    size="sm"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Box>
        </Stack>

        <Box mt="md">
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!isFormValid}
            fullWidth
          >
            <Text>Save</Text>
          </Button>
        </Box>
      </form>
    </LoginViewContainer>
  );
}
