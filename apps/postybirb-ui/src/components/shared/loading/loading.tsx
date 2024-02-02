import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiLoadingSpinnerSize } from '@elastic/eui/src/components/loading/loading_spinner';
import { ReactElement } from 'react';

type LoadingProps = {
  isLoading: boolean;
  size?: EuiLoadingSpinnerSize;
  children: ReactElement;
};

export default function Loading(props: LoadingProps): ReactElement {
  const { isLoading, size, children } = props;
  if (isLoading) {
    return (
      <div className="w-full">
        <EuiLoadingSpinner size={size} />
      </div>
    );
  }

  return children;
}

Loading.defaultProps = {
  size: 'm',
};
