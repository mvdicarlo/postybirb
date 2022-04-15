import { EuiCard } from '@elastic/eui';
import { ISettingsOptions, IWebsiteLoginInfo } from '@postybirb/dto';

type AccountLoginCardProps = {
  website: IWebsiteLoginInfo;
  onHide: (website: IWebsiteLoginInfo) => void;
};

export default function AccountLoginCard(
  props: AccountLoginCardProps
): JSX.Element {
  const { website, onHide } = props;
  return (
    <EuiCard textAlign="left" display="subdued" title={website.displayName}>
      Hi
    </EuiCard>
  );
}
