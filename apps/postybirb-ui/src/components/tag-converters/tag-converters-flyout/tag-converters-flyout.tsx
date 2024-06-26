import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { useDrawerToggle } from '../../../app/postybirb-layout/drawers/use-drawer-toggle';
import { TagConvertersKeybinding } from '../../../shared/app-keybindings';
import { TagConverterStore } from '../../../stores/tag-converter-store';
import { useStore } from '../../../stores/use-store';
import Keybinding, { KeybindingProps } from '../../app/keybinding/keybinding';
import Loading from '../../shared/loading/loading';
import TagConvertersTable from '../tag-converters-table/tag-converters-table';

export function TagConvertersFlyout() {
  const [isOpen, toggle] = useDrawerToggle('tagConvertersFlyoutVisible');
  const { state, isLoading } = useStore(TagConverterStore);

  const keybindingProps: KeybindingProps = {
    keybinding: TagConvertersKeybinding,
    onActivate: () => {},
  };
  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout
      ownFocus
      onClose={() => {
        toggle(false);
      }}
      style={{ minWidth: '75vw' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <div>
            <Keybinding displayOnly {...keybindingProps}>
              <Trans>Tag Converters</Trans>
            </Keybinding>
          </div>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Loading isLoading={isLoading}>
          <TagConvertersTable tagConverters={state} />
        </Loading>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
