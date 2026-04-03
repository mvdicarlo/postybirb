/**
 * TagConverterDrawer - Drawer for managing tag converters.
 * Uses the generic ConverterDrawer component with tag-specific configuration.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import type {
    ICreateTagConverterDto,
    IUpdateTagConverterDto,
} from '@postybirb/types';
import { IconHelp } from '@tabler/icons-react';
import { useMemo } from 'react';
import tagConvertersApi from '../../../api/tag-converters.api';
import { useTagConverters } from '../../../stores/entity/tag-converter-store';
import type { TagConverterRecord } from '../../../stores/records';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui/drawer-store';
import { useTourActions } from '../../../stores/ui/tour-store';
import { TAG_CONVERTERS_TOUR_ID } from '../../onboarding-tour/tours/tag-converters-tour';
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
  const { startTour } = useTourActions();

  const config = useMemo(
    (): ConverterDrawerConfig<
      TagConverterRecord,
      ICreateTagConverterDto,
      IUpdateTagConverterDto
    > => ({
      title: (
        <Group gap="xs">
          <Trans>Tag Converters</Trans>
          <Tooltip label={<Trans>Tag Converters Tour</Trans>}>
            <ActionIcon variant="subtle" size="xs" onClick={() => startTour(TAG_CONVERTERS_TOUR_ID)}>
              <IconHelp size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
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
    [startTour]
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
