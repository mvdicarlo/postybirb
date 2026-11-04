import { SelectField, TagField } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
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
export class TestFileSubmission extends BaseWebsiteOptions {
  @TagField({ maxTags: 10 })
  declare tags: TagValue;

  @SelectField({
    label: 'whoCanReply',
    section: 'website',
    span: 6,
    allowMultiple: true,
    options: [
      { value: 'nobody', label: 'Nobody' },
      { value: 'mention', label: 'Mentioned Users' },
      { value: 'following', label: 'Followed Users' },
    ],
  })
  whoCanReply: string[] = [];
}
