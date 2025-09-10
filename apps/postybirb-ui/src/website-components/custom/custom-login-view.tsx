import { Trans } from '@lingui/macro';
import {
    ActionIcon,
    Alert,
    Box,
    Button,
    Group,
    Select,
    Stack,
    Text,
    TextInput
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

  const [headersWithIds, setHeadersWithIds] = useState<HeaderWithId[]>([]);
  const [formData, setFormData] = useState<Omit<CustomAccountData, 'headers'>>({
    descriptionField: 'description',
    descriptionType: 'html',
    fileField: 'file',
    fileUrl: '',
    notificationUrl: '',
    ratingField: 'rating',
    tagField: 'tags',
    thumbnaiField: 'thumbnail',
    titleField: 'title',
    altTextField: 'alt',
  });

  // Initialize form data from props
  useEffect(() => {
    if (data) {
      const { headers, ...rest } = data;
      setFormData(prev => ({ ...prev, ...rest }));
      
      if (headers) {
        setHeadersWithIds(headers.map((header, index) => ({
          id: `header-${Date.now()}-${index}`,
          ...header,
        })));
      }
    }
  }, [data]);

  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const isFormValid = formData.fileUrl?.trim() || formData.notificationUrl?.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);

    try {
      // Convert headers back to original format for saving
      const headers = headersWithIds
        .filter(header => header.name.trim() && header.value.trim())
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

  const updateFormData = (field: keyof Omit<CustomAccountData, 'headers'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addHeader = () => {
    const newHeader: HeaderWithId = {
      id: `header-${Date.now()}-${Math.random()}`,
      name: '',
      value: '',
    };
    setHeadersWithIds(prev => [...prev, newHeader]);
  };

  const updateHeader = (headerId: string, field: 'name' | 'value', value: string) => {
    setHeadersWithIds(prev =>
      prev.map(header =>
        header.id === headerId ? { ...header, [field]: value } : header
      )
    );
  };

  const removeHeader = (headerId: string) => {
    setHeadersWithIds(prev => prev.filter(header => header.id !== headerId));
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <Stack>
        <Alert color="blue">
          <Trans>
            Configure custom webhook URLs and field mappings for your custom integration.
            You need at least one URL (File URL for file submissions or Notification URL for text-only posts).
          </Trans>
        </Alert>

        <TextInput
          label={<Trans>File URL</Trans>}
          description={<Trans>The URL that will be posted to when submitting files</Trans>}
          value={formData.fileUrl || ''}
          onChange={(event) => updateFormData('fileUrl', event.currentTarget.value)}
          placeholder="https://your-server.com/api/files"
        />

        <TextInput
          label={<Trans>Notification URL</Trans>}
          description={<Trans>The URL that will be posted to when submitting text-only posts</Trans>}
          value={formData.notificationUrl || ''}
          onChange={(event) => updateFormData('notificationUrl', event.currentTarget.value)}
          placeholder="https://your-server.com/api/notifications"
        />

        <Group grow>
          <TextInput
            label={<Trans>Title Field</Trans>}
            description={<Trans>Form field name for title</Trans>}
            value={formData.titleField || ''}
            onChange={(event) => updateFormData('titleField', event.currentTarget.value)}
          />
          <TextInput
            label={<Trans>Description Field</Trans>}
            description={<Trans>Form field name for description</Trans>}
            value={formData.descriptionField || ''}
            onChange={(event) => updateFormData('descriptionField', event.currentTarget.value)}
          />
        </Group>

        <Select
          label={<Trans>Description Type</Trans>}
          description={<Trans>How the description should be parsed</Trans>}
          value={formData.descriptionType || 'html'}
          onChange={(value) => updateFormData('descriptionType', value || 'html')}
          data={[
            { value: 'html', label: 'HTML' },
            { value: 'text', label: String(<Trans>Plain Text</Trans>) },
            { value: 'md', label: String(<Trans>Markdown</Trans>) },
            { value: 'bbcode', label: String(<Trans>BBCode</Trans>) },
          ]}
        />

        <Group grow>
          <TextInput
            label={<Trans>Tag Field</Trans>}
            description={<Trans>Form field name for tags</Trans>}
            value={formData.tagField || ''}
            onChange={(event) => updateFormData('tagField', event.currentTarget.value)}
          />
          <TextInput
            label={<Trans>Rating Field</Trans>}
            description={<Trans>Form field name for rating</Trans>}
            value={formData.ratingField || ''}
            onChange={(event) => updateFormData('ratingField', event.currentTarget.value)}
          />
        </Group>

        <Group grow>
          <TextInput
            label={<Trans>File Field</Trans>}
            description={<Trans>Form field name for files</Trans>}
            value={formData.fileField || ''}
            onChange={(event) => updateFormData('fileField', event.currentTarget.value)}
          />
          <TextInput
            label={<Trans>Thumbnail Field</Trans>}
            description={<Trans>Form field name for thumbnail</Trans>}
            value={formData.thumbnaiField || ''}
            onChange={(event) => updateFormData('thumbnaiField', event.currentTarget.value)}
          />
        </Group>

        <TextInput
          label={<Trans>Alt Text Field</Trans>}
          description={<Trans>Form field name for alt text</Trans>}
          value={formData.altTextField || ''}
          onChange={(event) => updateFormData('altTextField', event.currentTarget.value)}
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
            <Trans>Custom headers for authentication or other purposes</Trans>
          </Text>
          
          <Stack gap="xs">
            {headersWithIds.map((header) => (
              <Group key={header.id} align="end">
                <TextInput
                  placeholder={HEADER_NAME_PLACEHOLDER}
                  value={header.name}
                  onChange={(event) => updateHeader(header.id, 'name', event.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <TextInput
                  placeholder={HEADER_VALUE_PLACEHOLDER}
                  value={header.value}
                  onChange={(event) => updateHeader(header.id, 'value', event.currentTarget.value)}
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

        <Box>
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!isFormValid}
          >
            <Trans>Save Configuration</Trans>
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
