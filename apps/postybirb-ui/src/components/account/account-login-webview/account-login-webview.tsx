import { Box, Loader } from '@mantine/core';
import { AccountId } from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import accountApi from '../../../api/account.api';
import { WebviewTag } from './webview-tag';

type AccountLoginWebviewProps = {
  src: string;
  id: AccountId;
};

export function AccountLoginWebview(props: AccountLoginWebviewProps) {
  const { src, id } = props;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const webviewRef = useRef<WebviewTag>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedStopLoading = useCallback(
    debounce(() => {
      accountApi.refreshLogin(id);
    }, 2000),
    [id],
  );

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.addEventListener('did-stop-loading', () => {
        debouncedStopLoading();
        if (isLoading) {
          setIsLoading(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box w="100%" h="100%">
      {isLoading ? (
        <Box ta="center">
          <Loader size="xl" />
        </Box>
      ) : null}
      <webview
        src={src}
        ref={(ref) => {
          webviewRef.current = ref as WebviewTag;
        }}
        className="webview h-full w-full"
        // eslint-disable-next-line react/no-unknown-property
        webpreferences="nativeWindowOpen=1"
        // eslint-disable-next-line react/no-unknown-property
        partition={`persist:${id}`}
        // eslint-disable-next-line react/no-unknown-property, @typescript-eslint/no-explicit-any
        allowpopups={'true' as any}
      />
    </Box>
  );
}
