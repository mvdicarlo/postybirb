/**
 * UserConverterDrawer - Drawer for managing user converters.
 * Uses the generic ConverterDrawer component with user-specific configuration.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import type {
    ICreateUserConverterDto,
    IUpdateUserConverterDto,
} from '@postybirb/types';
import { IconHelp } from '@tabler/icons-react';
import { useMemo } from 'react';
import userConvertersApi from '../../../api/user-converters.api';
import { useUserConverters } from '../../../stores/entity/user-converter-store';
import type { UserConverterRecord } from '../../../stores/records';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui/drawer-store';
import { useTourActions } from '../../../stores/ui/tour-store';
import { USER_CONVERTERS_TOUR_ID } from '../../onboarding-tour/tours/user-converters-tour';
import {
    ConverterDrawer,
    type ConverterDrawerConfig,
} from '../converter-drawer';

// Drawer identifier
const DRAWER_KEY = 'userConverters';

/**
 * UserConverterDrawer component.
 * Gate pattern: returns null when closed to avoid entity store subscriptions.
 */
export function UserConverterDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();

  if (activeDrawer !== DRAWER_KEY) return null;

  return <UserConverterDrawerContent onClose={closeDrawer} />;
}

/**
 * Inner content — only mounted when drawer is open.
 */
function UserConverterDrawerContent({ onClose }: { onClose: () => void }) {
  const converters = useUserConverters();
  const { startTour } = useTourActions();

  const config = useMemo(
    (): ConverterDrawerConfig<
      UserConverterRecord,
      ICreateUserConverterDto,
      IUpdateUserConverterDto
    > => ({
      title: (
        <Group gap="xs">
          <Trans>User Converters</Trans>
          <Tooltip label={<Trans>User Converters Tour</Trans>}>
            <ActionIcon variant="subtle" size="xs" onClick={() => startTour(USER_CONVERTERS_TOUR_ID)}>
              <IconHelp size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
      primaryField: 'username',
      getPrimaryValue: (record: UserConverterRecord) => record.username,
      api: {
        create: (dto: ICreateUserConverterDto) => userConvertersApi.create(dto),
        update: (id: string, dto: IUpdateUserConverterDto) =>
          userConvertersApi.update(id, dto),
        remove: (ids: string[]) => userConvertersApi.remove(ids),
      },
      createUpdateDto: (
        username: string,
        convertTo: Record<string, string>
      ): IUpdateUserConverterDto => ({ username, convertTo }),
      createCreateDto: (
        username: string,
        convertTo: Record<string, string>
      ): ICreateUserConverterDto => ({ username, convertTo }),
      entityName: t`user converter`,
      duplicateError: t`A user converter with this username already exists`,
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
