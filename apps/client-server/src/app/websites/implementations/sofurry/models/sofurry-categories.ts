import { SelectOption } from '@postybirb/form-builder';
import { FileType } from '@postybirb/types';

/**
 * SoFurry category and type definitions based on API limits.
 * Each category has specific allowed types and file extensions.
 * Organized by FileType for discriminator-based filtering.
 */

/**
 * Categories organized by file type for form discriminator.
 */
export const SofurryCategoriesByFileType: Record<FileType, SelectOption[]> = {
  [FileType.IMAGE]: [
    { value: '10', label: 'Artwork' },
    { value: '30', label: 'Photography' },
  ],
  [FileType.TEXT]: [{ value: '20', label: 'Writing' }],
  [FileType.VIDEO]: [
    { value: '10', label: 'Artwork' }, // For animations
    { value: '50', label: 'Video' },
  ],
  [FileType.AUDIO]: [{ value: '40', label: 'Music' }],
  [FileType.UNKNOWN]: [
    { value: '10', label: 'Artwork' },
    { value: '60', label: '3D' },
  ],
};

/**
 * Types organized by file type for form discriminator.
 */
export const SofurryTypesByFileType: Record<FileType, SelectOption[]> = {
  [FileType.IMAGE]: [
    {
      label: 'Artwork',
      items: [
        { value: '11', label: 'Drawing' },
        { value: '12', label: 'Comic' },
        { value: '19', label: 'Other' },
      ],
    },
    {
      label: 'Photography',
      items: [
        { value: '31', label: 'Photograph' },
        { value: '32', label: 'Album' },
        { value: '39', label: 'Other' },
      ],
    },
  ],
  [FileType.TEXT]: [
    {
      label: 'Writing',
      items: [
        { value: '21', label: 'Short Story' },
        { value: '22', label: 'Book' },
        { value: '29', label: 'Other' },
      ],
    },
  ],
  [FileType.VIDEO]: [
    {
      label: 'Artwork',
      items: [
        { value: '13', label: 'Animation' },
        { value: '19', label: 'Other' },
      ],
    },
    { label: 'Video', items: [{ value: '59', label: 'Other' }] },
  ],
  [FileType.AUDIO]: [
    {
      label: 'Music',
      items: [
        { value: '41', label: 'Track' },
        { value: '42', label: 'Album' },
        { value: '49', label: 'Other' },
      ],
    },
  ],
  [FileType.UNKNOWN]: [
    {
      label: 'Artwork',
      items: [
        { value: '11', label: 'Drawing' },
        { value: '12', label: 'Comic' },
        { value: '13', label: 'Animation' },
        { value: '19', label: 'Other' },
      ],
    },
    { label: '3D', items: [{ value: '61', label: '3D Model' }] },
  ],
};

/**
 * Privacy options for submissions.
 */
export const SofurryPrivacyOptions: SelectOption[] = [
  { value: '3', label: 'Public' },
  { value: '2', label: 'Unlisted' },
  { value: '1', label: 'Private' },
];

/**
 * Get the category ID from a type ID.
 */
export function getCategoryFromType(typeId: string): string {
  const typeNum = parseInt(typeId, 10);
  return String(Math.floor(typeNum / 10) * 10);
}

/**
 * Get the default type for a category.
 */
export function getDefaultTypeForCategory(categoryId: string): string {
  const categoryNum = parseInt(categoryId, 10);
  // Default to first type in category (e.g., 10 -> 11, 20 -> 21)
  return String(categoryNum + 1);
}
