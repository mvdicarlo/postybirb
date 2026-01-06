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
import { useActiveDrawer, useDrawerActions } from '../../../stores/drawer-store';
import type { TagConverterRecord } from '../../../stores/records';
import { useTagConverters } from '../../../stores/tag-converter-store';
import {
  ConverterDrawer,
  type ConverterDrawerConfig,
} from '../converter-drawer';

// Drawer identifier
const DRAWER_KEY = 'tagConverters';

/**
 * TagConverterDrawer component.
 */
export function TagConverterDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const converters = useTagConverters();

  const opened = activeDrawer === DRAWER_KEY;

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
      opened={opened}
      onClose={closeDrawer}
      converters={converters}
      config={config}
    />
  );
}
