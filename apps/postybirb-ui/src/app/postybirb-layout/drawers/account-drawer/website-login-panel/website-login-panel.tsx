import {
  Box,
  CloseButton,
  Flex,
  Group,
  Paper,
  Portal,
  Text,
  Title,
} from '@mantine/core';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import { IconWorld } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import accountApi from '../../../../../api/account.api';
import remoteApi from '../../../../../api/remote.api';
import { AccountLoginWebview } from '../../../../../components/account/account-login-webview/account-login-webview';
import { REMOTE_HOST_KEY } from '../../../../../transports/http-client';
import { getCustomLoginComponent } from '../../../../../website-components/custom-login-components';
import { getOverlayOffset } from '../../drawer.util';
import './website-login-panel.css';

type WebsiteLoginPanelProps = {
  account: IAccountDto;
  website: IWebsiteInfoDto;
  onClose: () => void;
};

function LoginPanel(props: Omit<WebsiteLoginPanelProps, 'onClose'>) {
  const { account, website } = props;

  // Fine to be untranslated, this is a bug if it appears
  // eslint-disable-next-line lingui/no-unlocalized-strings
  let loginMethod: JSX.Element = <span>No login component found.</span>;

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

  return loginMethod;
}

export function WebsiteLoginPanel(props: WebsiteLoginPanelProps) {
  const { account, website, onClose } = props;
  const contentRef = useRef<HTMLDivElement>(null);
  const drawerOffset =
    document
      .getElementsByClassName('account-drawer')[0]
      ?.querySelector('section')?.offsetWidth ?? 0;

  const sidenavOffset =
    document.getElementById('postybirb__navbar')?.offsetWidth ?? 0;

  useEffect(
    () => () => {
      if (localStorage.getItem(REMOTE_HOST_KEY)?.length) {
        remoteApi.setCookies(account.id).then(() => {
          accountApi.refreshLogin(account.id);
        });
      } else {
        accountApi.refreshLogin(account.id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!drawerOffset) {
    return null;
  }

  const totalOffset = drawerOffset + sidenavOffset;
  const widthOffset = drawerOffset + getOverlayOffset();

  return (
    <Portal>
      <Box
        className="postybirb__website-login-panel"
        onWheelCapture={(event) => {
          // Avoids behavior of other scrolls interfering with panel scrolling
          event.stopPropagation();
        }}
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
        <Box
          className="postybirb__website-login-panel__content"
          ref={contentRef}
        >
          <LoginPanel {...props} />
        </Box>
      </Box>
    </Portal>
  );
}
