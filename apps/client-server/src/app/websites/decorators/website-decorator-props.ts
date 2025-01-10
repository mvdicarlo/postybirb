import {
  CustomLoginType,
  IWebsiteMetadata,
  UserLoginType,
  UsernameShortcut,
  WebsiteFileOptions,
} from '@postybirb/types';
import { LogLayer } from 'loglayer';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';

export type WebsiteDecoratorProps = {
  /**
   * Set by {@link SupportsFiles}
   *
   * Defines the file options for a website.
   * @type {WebsiteFileOptions}
   */
  fileOptions?: WebsiteFileOptions;

  /**
   * Set by {@link UserLoginFlow} or {@link CustomLoginFlow}
   *
   * Defines login flow properties for a website.
   * This is used to determine how a user will login to a website.
   * @type {UserLoginType} - User will login through a webview using the provided url.
   * @type {CustomLoginType} - User will login through a custom login flow created by the implementer.
   * @type {(UserLoginType | CustomLoginType)}
   */
  loginFlow: UserLoginType | CustomLoginType;

  /**
   * Set by {@link WebsiteMetadata}
   *
   * Defines the metadata for a website.
   * This is usually for display or internal Ids.
   * @type {IWebsiteMetadata}
   */
  metadata: IWebsiteMetadata;

  /**
   * Set by {@SupportsUsernameShortcut}
   *
   * Defines the username shortcut for a website.
   * This is used to modify links to users for websites that support it.
   * @type {UsernameShortcut}
   */
  usernameShortcut?: UsernameShortcut;

  /**
   * Disable Ads in description by using {@link DisableAdSupport}
   *
   * @type {boolean}
   */
  allowAd: boolean;
};

export function defaultWebsiteDecoratorProps(): WebsiteDecoratorProps {
  return {
    fileOptions: undefined,
    loginFlow: undefined,
    metadata: undefined,
    allowAd: true,
  };
}

/**
 * Injects basic website decorator properties into a website instance.
 *
 * @param {Class<UnknownWebsite>} constructor
 * @param {WebsiteDecoratorProps} props
 */
export function injectWebsiteDecoratorProps(
  constructor: Class<UnknownWebsite>,
  props: Partial<WebsiteDecoratorProps>,
): void {
  if (!constructor.prototype.decoratedProps) {
    Object.assign(constructor.prototype, {
      decoratedProps: defaultWebsiteDecoratorProps(),
    });
  }

  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined) {
      // eslint-disable-next-line no-param-reassign
      constructor.prototype.decoratedProps[key] = value;
    }
  });
}

export function validateWebsiteDecoratorProps(
  logger: LogLayer,
  websiteName: string,
  props: WebsiteDecoratorProps,
): boolean {
  if (!props.loginFlow) {
    logger
      .withContext({ websiteName })
      .error(
        'Website is missing login flow. Please set a login flow using UserLoginFlow or CustomLoginFlow decorators.',
      );
    return false;
  }

  if (!props.metadata) {
    logger
      .withContext({ websiteName })
      .error(
        'Website is missing metadata. Please set metadata using WebsiteMetadata decorator.',
      );
    return false;
  }

  if (!props.metadata.name) {
    logger.withContext({ websiteName }).error(`Missing metadata field 'name'`);
  }

  return true;
}
