import { Trans } from '@lingui/macro';
import { Drawer, Loader, Space, Stack } from '@mantine/core';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import { useState } from 'react';
import { useWebsites } from '../../../../hooks/account/use-websites';
import { useFlyoutToggle } from '../../../../hooks/use-flyout-toggle';
import {
  getOverlayOffset,
  getPortalTarget,
  marginOffset,
} from '../drawer.util';
import { WebsiteCard } from './website-card';
import { WebsiteLoginPanel } from './website-login-panel/website-login-panel';
import { WebsiteVisibilityPicker } from './website-visibility-picker';

export function AccountDrawer() {
  const [visible, toggle] = useFlyoutToggle('accountFlyoutVisible');
  const { accounts, isLoading, filteredWebsites } = useWebsites();
  const [loginAccount, setLoginAccount] = useState<{
    account: IAccountDto;
    website: IWebsiteInfoDto;
  } | null>(null);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <Drawer
        className="account-drawer"
        closeOnClickOutside
        size="lg"
        ml={-marginOffset}
        portalProps={{
          target: getPortalTarget(),
        }}
        overlayProps={{
          left: getOverlayOffset(),
          zIndex: 0,
        }}
        trapFocus
        opened={visible}
        onClose={() => {
          setLoginAccount(null);
          toggle();
        }}
        title={<Trans>Accounts</Trans>}
      >
        <WebsiteVisibilityPicker />
        <Space h="md" />
        <Stack gap="md">
          {filteredWebsites.map((website) => (
            <WebsiteCard
              key={website.id}
              website={website}
              accounts={accounts.filter(
                (account) => account.website === website.id
              )}
              onLogin={(
                login: { account: IAccountDto; website: IWebsiteInfoDto } | null
              ) => setLoginAccount(login)}
            />
          ))}
        </Stack>
      </Drawer>
      {loginAccount && visible ? (
        <WebsiteLoginPanel
          {...loginAccount}
          onClose={() => {
            setLoginAccount(null);
          }}
        />
      ) : null}
    </>
  );
}