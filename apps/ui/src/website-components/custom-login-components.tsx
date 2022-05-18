import { CustomLoginComponentProvider } from '../models/custom-login-component-provider';
import DiscordLoginView from './discord/discord-login-view';

const CustomLoginComponents: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomLoginComponentProvider<any>
> = Object.freeze({
  Discord: DiscordLoginView,
});

export function getCustomLoginComponent(
  loginComponentName: string
): CustomLoginComponentProvider<unknown> | undefined {
  return CustomLoginComponents[loginComponentName];
}
