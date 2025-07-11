import { Trans } from '@lingui/macro';
import {
  Box,
  CloseButton,
  Flex,
  Group,
  Paper,
  Text,
  Title,
} from '@mantine/core';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import { IconWorld } from '@tabler/icons-react';
import { useEffect } from 'react';
import accountApi from '../../../../../api/account.api';
import remoteApi from '../../../../../api/remote.api';
import { AccountLoginWebview } from '../../../../../components/account/account-login-webview/account-login-webview';
import { getCustomLoginComponent } from '../../../../../website-components/custom-login-components';
import {
  getOverlayOffset,
  getVerticalScrollbarOffset,
} from '../../drawer.util';
import './website-login-panel.css';

type WebsiteLoginPanelProps = {
  account: IAccountDto;
  website: IWebsiteInfoDto;
  onClose: () => void;
};

function LoginPanel(props: Omit<WebsiteLoginPanelProps, 'onClose'>) {
  const { account, website } = props;

  let loginMethod: JSX.Element = <Trans>No login component found.</Trans>;

  if (website.loginType.type === 'user') {
    loginMethod = (
      <AccountLoginWebview
        src={website.loginType.url}
        id={account.id}
        key={account.id}
      />
    );
  } else if (website.loginType.type === 'custom') {
    const CustomLoginComponent = getCustomLoginComponent(
      website.loginType.loginComponentName,
    );

    if (CustomLoginComponent !== undefined) {
      loginMethod = (
        <CustomLoginComponent
          account={account}
          website={website}
          key={account.id}
        />
      );
    }
  }

  return (
    // eslint-disable-next-line lingui/no-unlocalized-strings
    <Box h="calc(100% - 50px)" p="sm">
      {loginMethod}
    </Box>
  );
}

export function WebsiteLoginPanel(props: WebsiteLoginPanelProps) {
  const { account, website, onClose } = props;
  const offset =
    document
      .getElementsByClassName('account-drawer')[0]
      ?.querySelector('section')?.offsetWidth ?? 0;

  useEffect(
    () => () => {
      if (localStorage.getItem('remote_url')?.length) {
        remoteApi
          .setCookies(account.id)
          .then(() => {
            accountApi.refreshLogin(account.id);
          })
          .catch((error) => {
            // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
            console.error('Failed to set cookies for remote:', error);
          });
      } else {
        accountApi.refreshLogin(account.id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!offset) {
    return null;
  }

  const totalOffset = offset - 1;
  const widthOffset =
    offset + getOverlayOffset() + getVerticalScrollbarOffset();

  return (
    <Box
      p="sm"
      className="postybirb__website-login-panel"
      style={{
        left: totalOffset,
        width: `calc(100vw - ${widthOffset}px)`,
        height: '100vh',
      }}
    >
      <Paper
        className="postybirb__website-login-panel__header"
        shadow="sm"
        p="md"
        withBorder
      >
        <Flex align="center" justify="space-between">
          <Group>
            <IconWorld size={24} />
            <Box>
              <Title order={3}>{website.displayName}</Title>
              <Text size="sm">{account.name}</Text>
            </Box>
          </Group>
          <CloseButton
            size="lg"
            onClick={() => {
              onClose();
            }}
          />
        </Flex>
      </Paper>
      <LoginPanel {...props} />
    </Box>
  );
}
