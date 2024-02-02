import { EuiCallOut } from '@elastic/eui';
import { Trans } from '@lingui/macro';

export default function ErrorAlert(props: {
  error: string | object | undefined;
}) {
  const { error } = props;

  if (!error) {
    return null;
  }

  let message = '';
  if (typeof error === 'object') {
    message = JSON.stringify(error, null, 1);
  } else {
    message = error as string;
  }

  return (
    <EuiCallOut
      className="my-2"
      title={<Trans>Sorry, there was an error</Trans>}
      iconType="alert"
      color="danger"
    >
      <div style={{ whiteSpace: 'break-spaces' }}>{message}</div>
    </EuiCallOut>
  );
}
