import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { TagGroupsKeybinding } from '../../../shared/app-keybindings';
import { ModalProperties } from '../../../shared/common-properties/modal.properties';
import { TagGroupStore } from '../../../stores/tag-group-store';
import { useStore } from '../../../stores/use-store';
import Keybinding, { KeybindingProps } from '../../app/keybinding/keybinding';
import Loading from '../../shared/loading/loading';
import TagGroupsTable from '../tag-groups-table/tag-groups-table';

type TagGroupsFlyoutProps = ModalProperties;

export function TagGroupsFlyout(props: TagGroupsFlyoutProps) {
  const { state, isLoading } = useStore(TagGroupStore);

  const { onClose, isOpen } = props;
  const keybindingProps: KeybindingProps = {
    keybinding: TagGroupsKeybinding,
    onActivate: () => {},
  };
  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout ownFocus onClose={onClose} style={{ minWidth: '75vw' }}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <div>
            <Keybinding displayOnly {...keybindingProps}>
              <FormattedMessage id="tag-groups" defaultMessage="Tag Groups" />
            </Keybinding>
          </div>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Loading isLoading={isLoading}>
          <TagGroupsTable tagGroups={state} />
        </Loading>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
