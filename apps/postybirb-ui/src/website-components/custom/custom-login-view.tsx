import { Trans } from '@lingui/macro';
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
  useMantineTheme,
} from '@mantine/core';
import { CustomAccountData } from '@postybirb/types';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import accountApi from '../../api/account.api';
import { LoginComponentProps } from '../../models/login-component-props';
import {
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../website-login-helpers';

interface HeaderWithId {
  id: string;
  name: string;
  value: string;
}

const formId = 'custom-login-form';
const HEADER_NAME_PLACEHOLDER = 'Header name';
const HEADER_VALUE_PLACEHOLDER = 'Header value';

export default function CustomLoginView(
  props: LoginComponentProps<CustomAccountData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const theme = useMantineTheme();

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

      const cleanedData: CustomAccountData = {
        ...formData,
        headers,
      };

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
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Box style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
          <Stack>
            <Alert color="blue">
              <Trans>
                Configure custom webhook URLs and field mappings for your custom
                integration. You need at least one URL (File URL for file
                submissions or Notification URL for text-only posts).
              </Trans>
              <br />
              <br />
              <Trans>
                Custom website is for websites that you own and understand the
                actual backend of.
              </Trans>
            </Alert>

            <TextInput
              label={<Trans>File URL</Trans>}
              description={
                <Trans>
                  The URL that will be posted to when submitting files
                </Trans>
              }
              value={formData.fileUrl || ''}
              onChange={(event) =>
                updateFormData('fileUrl', event.currentTarget.value)
              }
              placeholder="https://your-server.com/api/files"
            />

            <TextInput
              label={<Trans>Notification URL</Trans>}
              description={
                <Trans>
                  The URL that will be posted to when submitting text-only posts
                </Trans>
              }
              value={formData.notificationUrl || ''}
              onChange={(event) =>
                updateFormData('notificationUrl', event.currentTarget.value)
              }
              placeholder="https://your-server.com/api/notifications"
            />

            <Group grow>
              <TextInput
                label={<Trans>Title Field</Trans>}
                value={formData.titleField || ''}
                onChange={(event) =>
                  updateFormData('titleField', event.currentTarget.value)
                }
              />
              <TextInput
                label={<Trans>Description Field</Trans>}
                value={formData.descriptionField || ''}
                onChange={(event) =>
                  updateFormData('descriptionField', event.currentTarget.value)
                }
              />
            </Group>

            <Group>
              <Text size="sm" fw={500}>
                <Trans>Description Type</Trans>
              </Text>
              <Radio.Group
                value={formData.descriptionType || 'html'}
                onChange={(value) =>
                  updateFormData('descriptionType', value || 'html')
                }
              >
                <Group>
                  <Radio value="html" label="HTML" />
                  <Radio value="text" label={<Trans>Plain Text</Trans>} />
                  <Radio value="md" label={<Trans>Markdown</Trans>} />
                  <Radio value="bbcode" label={<Trans>BBCode</Trans>} />
                </Group>
              </Radio.Group>
            </Group>

            <Group grow>
              <TextInput
                label={<Trans>Tag Field</Trans>}
                value={formData.tagField || ''}
                onChange={(event) =>
                  updateFormData('tagField', event.currentTarget.value)
                }
              />
              <TextInput
                label={<Trans>Rating Field</Trans>}
                value={formData.ratingField || ''}
                onChange={(event) =>
                  updateFormData('ratingField', event.currentTarget.value)
                }
              />
            </Group>

            <Group grow>
              <TextInput
                label={<Trans>File Field</Trans>}
                value={formData.fileField || ''}
                onChange={(event) =>
                  updateFormData('fileField', event.currentTarget.value)
                }
              />
              <TextInput
                label={<Trans>Thumbnail Field</Trans>}
                value={formData.thumbnailField || ''}
                onChange={(event) =>
                  updateFormData('thumbnailField', event.currentTarget.value)
                }
              />
            </Group>

            <TextInput
              label={<Trans>Alt Text Field</Trans>}
              value={formData.altTextField || ''}
              onChange={(event) =>
                updateFormData('altTextField', event.currentTarget.value)
              }
            />

            <Box>
              <Group justify="space-between" mb="sm">
                <Text size="sm" fw={500}>
                  <Trans>Headers</Trans>
                </Text>
                <ActionIcon variant="light" onClick={addHeader} size="sm">
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed" mb="md">
                <Trans>
                  Custom headers for authentication or other purposes
                </Trans>
              </Text>

              <Stack gap="xs">
                {headersWithIds.map((header) => (
                  <Group key={header.id} align="end">
                    <TextInput
                      placeholder={HEADER_NAME_PLACEHOLDER}
                      value={header.name}
                      onChange={(event) =>
                        updateHeader(
                          header.id,
                          'name',
                          event.currentTarget.value,
                        )
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
        </Box>

        {/* Sticky save bar */}
        <Box
          pos="sticky"
          bottom={0}
          left={0}
          right={0}
          style={{
            backgroundColor: 'inherit',
          }}
        >
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!isFormValid}
            fullWidth
          >
            <Trans>Save</Trans>
          </Button>
        </Box>
      </form>
    </Box>
  );
}
