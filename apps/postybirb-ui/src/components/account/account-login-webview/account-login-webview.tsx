import { EuiLoadingSpinner } from '@elastic/eui';
import { useEffect, useRef, useState } from 'react';
import { WebviewTag } from './webview-tag';

type AccountLoginWebviewProps = {
  src: string;
  id: string; // Account Id
};

export default function AccountLoginWebview(props: AccountLoginWebviewProps) {
  const { src, id } = props;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const webviewRef = useRef<WebviewTag>();

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.addEventListener('did-stop-loading', () => {
        if (isLoading) {
          setIsLoading(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full w-full">
      {isLoading ? (
        <div className="w-full text-center">
          <EuiLoadingSpinner size="xxl" />
        </div>
      ) : null}
      <webview
        src={src}
        ref={(ref) => {
          webviewRef.current = ref as WebviewTag;
        }}
        className="webview h-full w-full"
        webpreferences="nativeWindowOpen=1"
        partition={`persist:${id}`}
        allowpopups
      />
    </div>
  );
}
