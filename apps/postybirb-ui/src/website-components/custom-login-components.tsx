import { CustomLoginComponentProvider } from '../models/custom-login-component-provider';
import BlueskyLoginView from './bluesky/bluesky-login-view';
import DiscordLoginView from './discord/discord-login-view';
import InkbunnyLoginView from './inkbunny/inkbunny-login-view';
import TelegramLoginView from './telegram/telegram-login-view';

const CustomLoginComponents: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomLoginComponentProvider<any>
> = Object.freeze({
  Discord: DiscordLoginView,
  Telegram: TelegramLoginView,
  Bluesky: BlueskyLoginView,
  Inkbunny: InkbunnyLoginView,
});

export function getCustomLoginComponent(
  loginComponentName: string,
): CustomLoginComponentProvider<unknown> | undefined {
  return CustomLoginComponents[loginComponentName];
}
