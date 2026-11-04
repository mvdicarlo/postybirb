# How to add a Website to PostyBirb

This guide walks you through the basic steps of setting up a new PostyBirb website implementation.

For the purposes of examples, website `Foo` will be used.

It is not likely to be an exhaustive reference and should be seen as a living document that I will
do my best to keep updated as things change.

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
import { LoginResult } from '@postybirb/types';
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

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FooAccountData> = {
    nonSensitiveProperty: true,
    sensitiveProperty: false,
  };

  public async onLogin(): Promise<LoginResult> {
    if (this.account.name === 'test') {
      return { loggedIn: false };
    }

    await this.websiteDataStore.setData({
      sensitiveProperty: '<SECRET-API-KEY>',
      nonSensitiveProperty: ['folder1', 'folder2'],
    });
    return { loggedIn: true, username: 'TestUser' };
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
- [Description Parsing](./sections/description-parsing.md)
- [Specifying User Input / UI Form Specification](./sections/defining-submission-data.md)

## Migrating Stored Website Options

Declare an append-only migration history on the concrete file or message option
class when changing persisted field shapes. Migration metadata is server-only
and separate from form-field decorators.

```ts
import { sql } from 'drizzle-orm';
import { MigrateWebsiteOptions } from '../../../decorators/migrate-website-options.decorator';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

@MigrateWebsiteOptions([
  {
    version: 1,
    name: 'Convert reply permissions to an array',
    where: ({ data }) => sql`json_type(${data}, '$.whoCanReply') = 'text'`,
    migrate: (data) => {
      if (typeof data.whoCanReply !== 'string') {
        return { ...data };
      }
      return {
        ...data,
        whoCanReply: data.whoCanReply.split(',').filter(Boolean),
      };
    },
  },
])
export class FooFileSubmission extends BaseWebsiteOptions {
  whoCanReply: string[] = [];
}
```

- Start at version `1` and append consecutive versions. Each bundle can change
  any number of fields, including fields changed by earlier bundles. Never
  reorder, remove, or repurpose a released version.
- Return the complete next options object from a synchronous, pure `migrate`
  function. Preserve unrelated fields and treat historical values as unknown;
  do not fill in current model defaults or merge shared defaults here.
- `where` is optional. It selects records needing a transformation; the runner
  always adds website, submission-type, and previous-version restrictions.
  Include every value needing conversion. Nonmatching records advance their
  version directly in SQL without loading JSON or changing `updatedAt`.
- Startup runs bundles in order and commits each record's data and version
  together. A failed bundle leaves that record at its last successful version,
  skips its later bundles, logs the failure, and retries next startup. Other
  records and startup continue. Failed records are not blocked from posting.
- Ordinary submissions, archived submissions, and templates are included.
  Shared default options use `DefaultWebsiteOptions` and a separate null-account
  scope. File and message model histories are independent.
- Fresh options start at the current model version. Duplicates, server-side
  template copies, and account defaults carry the source version without
  blocking insertion. The template picker sends `sourceOptionId` so the server
  copies stored data and its version together. Merges retain the lower source
  or destination version; template payloads without a source ID start at zero.
  Public create payloads are assumed to contain current-format client input;
  runtime import normalization is not provided.
- Migration histories are not implicitly inherited. Each concrete option class
  owns its full history; explicitly reuse migration functions or bundle arrays
  when several models need the same changes.
- Model discovery calls existing model factories on uninitialized website
  instances. Constructors and model factories must not require login, perform
  I/O, or start background work; put lifecycle work in `onInitialize` instead.
- Pending data migrations request a database backup using the existing backup
  retention policy. Backup failures are logged without preventing startup.
  Versions newer than the installed model are left untouched; there are no
  downgrade migrations.

`WebsiteOptionsMigrationService.runPendingMigrations()` is the reusable entry
point. It returns counts of data updates, version-only advances, failures, and
future-version records. Committed data changes use the existing submission
projection notification, so connected clients receive refreshed options.

## Relevant Differences from V3 (PostyBirb+)

- Each user account receives its own object instance so developers no longer
  need to worry about overwriting data shared with another logged in account.
- Most metadata is set through custom decorators.
- Descriptions are no longer collected as plain HTML and for now (semi-experimental) are
  using BlockNote.
- There are many common validations that can occur with the assistance of decorators
  reducing the need for tons of duplicate code for validations.
