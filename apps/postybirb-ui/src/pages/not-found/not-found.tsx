import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { useNavigate } from 'react-router';

export default function NotFound() {
  const history = useNavigate();
  return (
    <EuiEmptyPrompt
      title={
        <h2>
          <Trans comment="Page not found header">Page not found</Trans>
        </h2>
      }
      layout="vertical"
      body={
        <p>
          <Trans comment="Page not found text">
            The page you are looking for might have been removed or temporarily
            unavailable.
          </Trans>
        </p>
      }
      actions={[
        <EuiButton color="primary" fill onClick={() => history('/')}>
          <Trans comment="Page not found">Go home</Trans>
        </EuiButton>,
        <EuiButtonEmpty
          iconType="arrowLeft"
          flush="left"
          onClick={() => history(-1)}
        >
          <Trans comment="Page not found">Go back</Trans>
        </EuiButtonEmpty>,
      ]}
    />
  );
}
