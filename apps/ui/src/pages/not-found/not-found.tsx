import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useHistory } from 'react-router';

export default function NotFound() {
  const history = useHistory();
  return (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="page-not-found.headaer"
            defaultMessage="Page not found"
          />
        </h2>
      }
      layout="vertical"
      body={
        <p>
          <FormattedMessage
            id="page-not-found.message"
            defaultMessage="The page you are looking for might have been removed or temporarily
          unavailable."
          />
        </p>
      }
      actions={[
        <EuiButton color="primary" fill onClick={() => history.push('/')}>
          <FormattedMessage
            id="page-not-found.go-home"
            defaultMessage="Go home"
          />
        </EuiButton>,
        <EuiButtonEmpty
          iconType="arrowLeft"
          flush="left"
          onClick={history.goBack}
        >
          <FormattedMessage
            id="page-not-found.go-back"
            defaultMessage="Go back"
          />
        </EuiButtonEmpty>,
      ]}
    />
  );
}
