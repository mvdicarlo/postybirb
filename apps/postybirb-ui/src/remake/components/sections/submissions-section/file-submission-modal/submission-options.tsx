/**
 * SubmissionOptions - Options panel for file submissions.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    Box,
    ScrollArea,
    SegmentedControl,
    Stack,
    Text
} from '@mantine/core';
import {
    Description,
    SubmissionId,
    SubmissionRating,
    SubmissionType,
    Tag,
} from '@postybirb/types';
import { IconFileText, IconTemplate } from '@tabler/icons-react';
import { useState } from 'react';
import { DescriptionEditor } from '../../../shared/description-editor';
import { RatingInput } from '../../../shared/rating-input';
import { SimpleTagInput } from '../../../shared/simple-tag-input';
import { TemplatePicker } from '../../../shared/template-picker/template-picker';
import './file-submission-modal.css';

type OptionsMode = 'custom' | 'template';

export interface SubmissionOptionsProps {
  /** Submission type for template filtering */
  type: SubmissionType;
  /** Current rating */
  rating: SubmissionRating;
  /** Rating change handler */
  onRatingChange: (rating: SubmissionRating) => void;
  /** Current tags */
  tags: Tag[];
  /** Tags change handler */
  onTagsChange: (tags: Tag[]) => void;
  /** Current description */
  description: Description;
  /** Description change handler */
  onDescriptionChange: (description: Description) => void;
  /** Currently selected template ID */
  selectedTemplateId?: SubmissionId;
  /** Template selection handler */
  onTemplateChange: (id: SubmissionId | undefined) => void;
}

/**
 * Options panel for customizing submission defaults.
 * Users can choose between custom options OR a template, not both.
 */
export function SubmissionOptions({
  type,
  rating,
  onRatingChange,
  tags,
  onTagsChange,
  description,
  onDescriptionChange,
  selectedTemplateId,
  onTemplateChange,
}: SubmissionOptionsProps) {
  const { t } = useLingui();
  const [mode, setMode] = useState<OptionsMode>('custom');

  const handleModeChange = (newMode: string) => {
    setMode(newMode as OptionsMode);
    // Clear the other mode's data when switching
    if (newMode === 'template') {
      // Clear custom options when switching to template
      onRatingChange(SubmissionRating.GENERAL);
      onTagsChange([]);
      onDescriptionChange([]);
    } else {
      // Clear template when switching to custom
      onTemplateChange(undefined);
    }
  };

  return (
    <Box className="postybirb__file_submission_modal_column">
      <Text size="sm" fw={500} mb="xs">
        <Trans>Defaults</Trans>
      </Text>

      {/* Mode Toggle */}
      <SegmentedControl
        value={mode}
        onChange={handleModeChange}
        fullWidth
        mb="md"
        data={[
          {
            value: 'custom',
            label: (
              <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconFileText size={14} />
                <Trans>Custom</Trans>
              </Box>
            ),
          },
          {
            value: 'template',
            label: (
              <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconTemplate size={14} />
                <Trans>Template</Trans>
              </Box>
            ),
          },
        ]}
      />

      <ScrollArea style={{ flex: 1 }} offsetScrollbars type="auto">
        {mode === 'custom' ? (
          <Stack gap="md" pr="xs">
            {/* Rating */}
            <Box>
              <Text size="sm" fw={500} mb="xs">
                <Trans>Rating</Trans>
              </Text>
              <RatingInput value={rating} onChange={onRatingChange} size="md" />
            </Box>

            {/* Tags */}
            <SimpleTagInput
              label={t`Tags`}
              value={tags}
              onChange={onTagsChange}
              placeholder={t`Add tags...`}
            />

            {/* Description */}
            <Box>
              <Text size="sm" fw={500} mb="xs">
                <Trans>Description</Trans>
              </Text>
              <DescriptionEditor
                value={description}
                onChange={onDescriptionChange}
              />
            </Box>
          </Stack>
        ) : (
          <Stack gap="md" pr="xs">
            {/* Template Picker */}
            <Box>
              <TemplatePicker
                type={type}
                value={selectedTemplateId}
                onChange={(id) => onTemplateChange(id ?? undefined)}
              />
            </Box>
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}
