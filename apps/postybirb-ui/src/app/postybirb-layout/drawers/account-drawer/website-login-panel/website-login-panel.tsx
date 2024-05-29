import { Trans } from '@lingui/macro';
import { Box, CloseButton, Flex, Title } from '@mantine/core';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import accountApi from '../../../../../api/account.api';
import { AccountLoginWebview } from '../../../../../components/account/account-login-webview/account-login-webview';
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

  let loginMethod: JSX.Element = <Trans>No login component found.</Trans>;

  if (website.loginType.type === 'user') {
    loginMethod = (
      <AccountLoginWebview src={website.loginType.url} id={account.id} />
    );
  } else if (website.loginType.type === 'custom') {
    const CustomLoginComponent = getCustomLoginComponent(
      website.loginType.loginComponentName
    );

    if (CustomLoginComponent !== undefined) {
      loginMethod = (
        <CustomLoginComponent account={account} website={website} />
      );
    }
  }

  return (
    // eslint-disable-next-line lingui/no-unlocalized-strings
    <Box h="calc(100% - 34px)" p="sm">
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

  if (!offset) {
    return null;
  }

  const totalOffset = offset - 13;
  const widthOffset = offset + getOverlayOffset() - 13;
  return (
    <Box
      p="sm"
      className="postybirb__website-login-panel"
      style={{
        left: totalOffset,
        width: `calc(100vw - ${widthOffset}px)`,
      }}
    >
      <div className="postybirb__website-login-panel__header">
        <Flex>
          <Title order={3} flex="12">
            {website.displayName} - {account.name}
          </Title>
          <div>
            <CloseButton
              variant="transparent"
              onClick={() => {
                accountApi.refreshLogin(account.id);
                onClose();
              }}
            />
          </div>
        </Flex>
        <hr style={{ borderColor: 'var(--mantine-color-dimmed)' }} />
      </div>
      <LoginPanel {...props} />
    </Box>
  );
}
