/**
 * TagConverterDrawer - Drawer for managing tag converters.
 * Uses the generic ConverterDrawer component with tag-specific configuration.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type {
    ICreateTagConverterDto,
    IUpdateTagConverterDto,
} from '@postybirb/types';
import { useMemo } from 'react';
import tagConvertersApi from '../../../api/tag-converters.api';
import { useTagConverters } from '../../../stores/entity/tag-converter-store';
import type { TagConverterRecord } from '../../../stores/records';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui/drawer-store';
import {
    ConverterDrawer,
    type ConverterDrawerConfig,
} from '../converter-drawer';

// Drawer identifier
const DRAWER_KEY = 'tagConverters';

/**
 * TagConverterDrawer component.
 * Gate pattern: returns null when closed to avoid entity store subscriptions.
 */
export function TagConverterDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();

  if (activeDrawer !== DRAWER_KEY) return null;

  return <TagConverterDrawerContent onClose={closeDrawer} />;
}

/**
 * Inner content — only mounted when drawer is open.
 */
function TagConverterDrawerContent({ onClose }: { onClose: () => void }) {
  const converters = useTagConverters();

  const config = useMemo(
    (): ConverterDrawerConfig<
      TagConverterRecord,
      ICreateTagConverterDto,
      IUpdateTagConverterDto
    > => ({
      title: <Trans>Tag Converters</Trans>,
      primaryField: 'tag',
      getPrimaryValue: (record: TagConverterRecord) => record.tag,
      api: {
        create: (dto: ICreateTagConverterDto) => tagConvertersApi.create(dto),
        update: (id: string, dto: IUpdateTagConverterDto) =>
          tagConvertersApi.update(id, dto),
        remove: (ids: string[]) => tagConvertersApi.remove(ids),
      },
      createUpdateDto: (
        tag: string,
        convertTo: Record<string, string>
      ): IUpdateTagConverterDto => ({ tag, convertTo }),
      createCreateDto: (
        tag: string,
        convertTo: Record<string, string>
      ): ICreateTagConverterDto => ({ tag, convertTo }),
      entityName: t`tag converter`,
      duplicateError: t`A tag converter with this tag already exists`,
    }),
    []
  );

  return (
    <ConverterDrawer
      opened
      onClose={onClose}
      converters={converters}
      config={config}
    />
  );
}
