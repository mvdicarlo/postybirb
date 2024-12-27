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

### UI Considerations

TODO decorator

TODO Custom view

## OAuth / More Complex Login Flows

TODO