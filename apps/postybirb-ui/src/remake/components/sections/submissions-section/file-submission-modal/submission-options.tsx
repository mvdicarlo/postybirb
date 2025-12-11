/**
 * SubmissionOptions - Options panel for file submissions.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { Box, ScrollArea, Stack, Text } from '@mantine/core';
import {
    Description,
    SubmissionId,
    SubmissionRating,
    SubmissionType,
    Tag,
} from '@postybirb/types';
import { DescriptionEditor } from '../../../shared/description-editor';
import { RatingInput } from '../../../shared/rating-input';
import { SimpleTagInput } from '../../../shared/simple-tag-input';
import { TemplatePicker } from '../../../shared/template-picker/template-picker';
import './file-submission-modal.css';

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

  return (
    <Box className="postybirb__file_submission_modal_column">
      <Text size="sm" fw={500} mb="xs">
        <Trans>Customize</Trans>
      </Text>
      <ScrollArea style={{ flex: 1 }} offsetScrollbars type="auto">
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

          {/* Template Picker */}
          <Box>
            <Text size="sm" fw={500} mb="xs">
              <Trans>Apply Template</Trans>
            </Text>
            <TemplatePicker
              type={type}
              value={selectedTemplateId}
              onChange={(id) => onTemplateChange(id ?? undefined)}
            />
          </Box>
        </Stack>
      </ScrollArea>
    </Box>
  );
}
