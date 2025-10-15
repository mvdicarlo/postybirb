import { CustomLoginComponentProvider } from '../models/custom-login-component-provider';
import BlueskyLoginView from './bluesky/bluesky-login-view';
import CustomLoginView from './custom/custom-login-view';
import DiscordLoginView from './discord/discord-login-view';
import E621LoginView from './e621/e621-login-view';
import InkbunnyLoginView from './inkbunny/inkbunny-login-view';
import MegalodonLoginView from './megalodon/megalodon-login-view';
import TelegramLoginView from './telegram/telegram-login-view';
import TwitterLoginView from './twitter/twitter-login-view';

const CustomLoginComponents: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomLoginComponentProvider<any>
> = Object.freeze({
  Bluesky: BlueskyLoginView,
  Custom: CustomLoginView,
  Discord: DiscordLoginView,
  Friendica: MegalodonLoginView,
  GoToSocial: MegalodonLoginView,
  Inkbunny: InkbunnyLoginView,
  Mastodon: MegalodonLoginView,
  Pixelfed: MegalodonLoginView,
  Pleroma: MegalodonLoginView,
  Telegram: TelegramLoginView,
  Twitter: TwitterLoginView,
  e621: E621LoginView,
});

export function getCustomLoginComponent(
  loginComponentName: string,
): CustomLoginComponentProvider<unknown> | undefined {
  return CustomLoginComponents[loginComponentName];
}
