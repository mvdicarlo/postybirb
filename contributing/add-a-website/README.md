# How to add a Website to PostyBirb

This guide walks you through the basic steps of setting up a new PostyBirb website implementation.

For the purposes of examples, website `Foo` will be used.

It is not likely to be an exhaustive reference and should be seen as a living document that I will
do my best to keep updated as things change.

> [!WARNING]
> Websites that support, promote, or enable illicit or illegal behavior/content will be rejected.

## Starting Out

To start out you should locate the website directory located [here](../apps/client-server/src/app/websites/implementations/)
for your own use later.

### Quick Start

First consider a valid dash-case name of the website you are adding.

**Examples**
- Google -> google
- NewYork -> new-york or newyork

From the base `postybirb` path, run the command.
> `node scripts/add-website.js`

#### Sample

```ts
import { ILoginState } from '@postybirb/types';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { Website } from '../../website';

export type FooAccountData = {
  sensitiveProperty: string;
  nonSensitiveProperty: string[];
};

@WebsiteMetadata({
  name: 'foo',
  displayName: 'Foo',
})
export default class Foo extends Website<FooAccountData> {
  protected BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FooAccountData> =
    {
      nonSensitiveProperty: true,
      sensitiveProperty: false,
    };

  public async onLogin(): Promise<ILoginState> {
    if (this.account.name === 'test') {
      this.loginState.logout();
    }

    await this.websiteDataStore.setData({
      sensitiveProperty: '<SECRET-API-KEY>',
      nonSensitiveProperty: ['folder1', 'folder2'],
    });
    return this.loginState.setLogin(true, 'TestUser');
  }
}
```

### Sample Explained

#### Base Website Class

All websites within PostyBirb must extend the [Website](../apps/client-server/src/app/websites/website.ts)
class as it contains important logic used elsewhere within the application.

#### WebsiteMetadata Decorator

Metadata for a website is set through the use of one or more decorators. The only required one at
the moment is `@WebsiteMetadata` to set an Identifying `name` property and a `displayName` that is
used within the UI.

Once a website is officially published the `name` property will likely never be changed
as it is used to connect pieces of data together for logged in accounts.

#### Additional Decorators

Other metadata decorators can be found [here](../apps/client-server/src/app/websites/decorators/).
It is likely many will be used in every website implementation.

#### Base Url

The `BASE_URL` field is one of the few semi-required fields to be used as a common
URL for outgoing requests.

#### ExternallyAccessibleWebsiteDataProperties

This will likely be moved into an optional interface in the future. But for now
it is used to define which properties defined in `Website<TAccountData>` are
allowed to be returned to the UI as we don't really want to pass sensitive API
keys or secrets if we can avoid it.

#### onLogin

The `onLogin` function is called whenever a user interacts with an account in
the UI or whenever the `refreshInterval` occurs (as defined in the WebsiteMetadata
decorator). It also runs once at startup.

This is where login state and additional data retrieval is intended to occur
by interacting with the underlying website `loginState` (in memory)
and `websiteDataStore` (in database).


## How To

- [Login and Authenticate Users](./sections/authenticate-a-user.md)
- [Post Files](./sections/file-website.md)
- [Post Messages](./sections/message-website.md)
- [Validate User Input](./sections/validation.md)
  
## Relevant Differences from V3 (PostyBirb+)

- Each user account receives its own object instance so developers no longer
 need to worry about overwriting data shared with another logged in account.
- Most metadata is set through custom decorators.