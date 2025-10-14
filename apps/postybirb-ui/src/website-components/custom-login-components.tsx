import { CustomLoginComponentProvider } from '../models/custom-login-component-provider';
import BlueskyLoginView from './bluesky/bluesky-login-view';
import CustomLoginView from './custom/custom-login-view';
import DiscordLoginView from './discord/discord-login-view';
import E621LoginView from './e621/e621-login-view';
import InkbunnyLoginView from './inkbunny/inkbunny-login-view';
import MastodonLoginView from './mastodon/mastodon-login-view';
import PixelfedLoginView from './pixelfed/pixelfed-login-view';
import PleromaLoginView from './pleroma/pleroma-login-view';
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
  Inkbunny: InkbunnyLoginView,
  Mastodon: MastodonLoginView,
  Pixelfed: PixelfedLoginView,
  Pleroma: PleromaLoginView,
  Telegram: TelegramLoginView,
  Twitter: TwitterLoginView,
  e621: E621LoginView,
});

export function getCustomLoginComponent(
  loginComponentName: string,
): CustomLoginComponentProvider<unknown> | undefined {
  return CustomLoginComponents[loginComponentName];
}
