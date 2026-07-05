/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import {
    Alert,
    Badge,
    Box,
    SegmentedControl,
    Stack,
    Text,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useAccount } from '../../../stores';
import { LoginWebview } from '../../sections/accounts-section/login-webview';
import type { LoginViewProps } from '../types';

const SUBSCRIBESTAR_COM_LOGIN = 'https://www.subscribestar.com/login';
const SUBSCRIBESTAR_ADULT_LOGIN = 'https://www.subscribestar.adult/login';

export default function SubscribeStarAdultLoginView(
  props: LoginViewProps,
): JSX.Element {
  const { account } = props;
  const [activeTab, setActiveTab] = useState<string>('com');

  const accountState = useAccount(account.id);
  const isLoggedIn = accountState?.isLoggedIn ?? false;

  return (
    <Stack gap="xs">
      <Alert
        icon={<IconInfoCircle size={16} />}
        color="orange"
        variant="light"
      >
        <Text size="sm">
          <Trans>
            SubscribeStar Adult requires you to be logged in to both
            subscribestar.com AND subscribestar.adult. Please log in to both
            sites below.
          </Trans>
        </Text>
      </Alert>

      {isLoggedIn && (
        <Badge color="green" variant="light" size="lg" fullWidth>
          <Trans>Login verified</Trans>
        </Badge>
      )}

      <SegmentedControl
        value={activeTab}
        onChange={setActiveTab}
        data={[
          { label: 'subscribestar.com', value: 'com' },
          { label: 'subscribestar.adult', value: 'adult' },
        ]}
        fullWidth
      />

      <Box
        style={{
          height: 500,
          display: activeTab === 'com' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <LoginWebview
          src={SUBSCRIBESTAR_COM_LOGIN}
          accountId={account.id}
        />
      </Box>

      <Box
        style={{
          height: 500,
          display: activeTab === 'adult' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <LoginWebview
          src={SUBSCRIBESTAR_ADULT_LOGIN}
          accountId={account.id}
        />
      </Box>
    </Stack>
  );
}
