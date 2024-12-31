# Login / Authenticate A User

Logging in a user and retrieving specific details on the account is the first thing that needs to
be figured out when adding a new website.

## OnLogin

All websites are required to implement the `onLogin` function, returning a `ILoginState` value.

This `onLogin` method is responsible for handling all login state for a user and is called in the
following scenarios:

- User closes the UI login panel
- Startup of the application
- When the `refreshInterval` is reached (default 1 hour)

> [!IMPORTANT]
> Implementations of onLogin should catch its own errors, log, and update state appropriately.

### Sample

```ts
  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(
        `${this.BASE_URL}/user`,
        { partition: this.accountId },
      );

      if (res.body.includes('logout-link')) {
        const $ = load(res.body);
        return this.loginState.setLogin(
          true,
          $('.loggedin_user_avatar').attr('alt'),
        );
      }

      return this.loginState.setLogin(false, null);
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.setLogin(false, null);
    }
  }
```

## How To Set Up A Login Flow For Users

```ts
import { UserLoginFlow } from '../../decorators/login-flow.decorator';

@UserLoginFlow('https://foo.com/login')
export default class Foo extends Website<FooAccountData> {
    // Class Impl
}
```

PostyBirb supports 3 ways to login a user to their accounts.

1. Direct browser-like login (webview) using the `@UserLoginFlow(url)` decorator
to automatically hook up login within the UI.
2. Custom Login Flow using the `@CustomLoginFlow(name(optional))` which requires the
creation of a custom React component to handle retrieval of certain information for login.
A simple example of this can be seen used by the Discord implementation
[here](../../../apps/postybirb-ui/src/website-components/discord/).
3. OAuth flows. Currently this is still being defined and this documentation will be updated
once a more stable example has been created.

## Storing Account / Login Information

### Short Term (In-Memory)

You can store information in the object itself that only lives as long as the app is
running however you like.

### Long Term (Database)

All details that need to be stored long-term such as API keys should be stored within
each class' `websiteDataStore`. These can be set at any time, though the preference would
be during `onLogin` calls or from a UI component calling `accountApi.setWebsiteData`.

Storing things within the data store also allows for injection of data into the form
generator by default which is elaborated on in other sections.
