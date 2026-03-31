/**
 * TemplatesSection - Section panel for managing submission templates.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import {
  IconFile,
  IconMessage,
  IconPlus,
  IconTemplate,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import {
  useSubmissionsLoading,
  useTemplateSubmissions,
} from '../../../stores/entity/submission-store';
import { useNavigationStore } from '../../../stores/ui/navigation-store';
import { useTemplatesFilter } from '../../../stores/ui/templates-ui-store';
import { isTemplatesViewState, type ViewState } from '../../../types/view-state';
import {
  showErrorNotification,
  showSuccessNotification,
} from '../../../utils/notifications';
import { EmptyState } from '../../empty-state';
import { SearchInput } from '../../shared';
import { TemplateCard } from './template-card';
import './templates-section.css';

interface TemplatesSectionProps {
  viewState: ViewState;
}

/**
 * Templates section panel with search, tabs, and template list.
 */
export function TemplatesSection({ viewState }: TemplatesSectionProps) {
  const { t } = useLingui();
  const templates = useTemplateSubmissions();
  const { isLoading } = useSubmissionsLoading();
  const { tabType, searchQuery, setTabType, setSearchQuery } =
    useTemplatesFilter();
  const setViewState = useNavigationStore((state) => state.setViewState);

  // Create template modal
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Get selected template ID from view state
  const selectedTemplateId = isTemplatesViewState(viewState)
    ? viewState.params.selectedId
    : null;

  // Handle selecting a template
  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      if (isTemplatesViewState(viewState)) {
        setViewState({
          ...viewState,
          params: {
            ...viewState.params,
            selectedId: templateId,
          },
        });
      }
    },
    [viewState, setViewState]
  );

  // Handle creating a new template
  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) return;

    setIsCreating(true);
    try {
      await submissionApi.create({
        name: newTemplateName.trim(),
        type: tabType,
        isTemplate: true,
      });
      showSuccessNotification(<Trans>Template created</Trans>);
      setNewTemplateName('');
      closeModal();
    } catch {
      showErrorNotification(<Trans>Failed to create template</Trans>);
    } finally {
      setIsCreating(false);
    }
  }, [newTemplateName, tabType, closeModal]);

  // Handle key press in input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCreateTemplate();
      }
    },
    [handleCreateTemplate]
  );

  // Filter templates by type and search query
  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        // Filter by type
        if (template.type !== tabType) return false;

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const name = template.title?.toLowerCase() ?? '';
          if (!name.includes(query)) return false;
        }

        return true;
      }),
    [templates, tabType, searchQuery]
  );

  return (
    <Box h="100%" className="postybirb__templates__section">
      {/* Header */}
      <Stack gap="xs" p="xs" className="postybirb__templates__header">
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light">
            <IconTemplate size={14} />
          </ThemeIcon>
          <Text size="sm" fw={500}>
            <Trans>Templates</Trans>
          </Text>
        </Group>

        {/* Search */}
        <SearchInput
          size="xs"
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Tabs */}
        <SegmentedControl
          size="xs"
          fullWidth
          value={tabType}
          onChange={(value) => setTabType(value as SubmissionType)}
          data={[
            {
              value: SubmissionType.FILE,
              label: (
                <Group gap={4} justify="center">
                  <IconFile size={14} />
                  <Trans>File</Trans>
                </Group>
              ),
            },
            {
              value: SubmissionType.MESSAGE,
              label: (
                <Group gap={4} justify="center">
                  <IconMessage size={14} />
                  <Trans>Message</Trans>
                </Group>
              ),
            },
          ]}
        />

        {/* Create new template */}
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={openModal}
          fullWidth
        >
          <Trans>Create New Template</Trans>
        </Button>
      </Stack>

      {/* Create template modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={<Trans>Create New Template</Trans>}
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label={<Trans>Template Name</Trans>}
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isCreating}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal} disabled={isCreating}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newTemplateName.trim()}
              loading={isCreating}
            >
              <Trans>Create</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Divider />

      {/* Template list */}
      <ScrollArea style={{ flex: 1 }} type="hover" scrollbarSize={6}>
        <Stack gap="xs" p="xs">
          {isLoading ? (
            <Box ta="center" py="xl">
              <Loader size="sm" />
            </Box>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState preset="no-results" size="sm" />
          ) : (
            filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={template.id === selectedTemplateId}
                onSelect={handleSelectTemplate}
              />
            ))
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
