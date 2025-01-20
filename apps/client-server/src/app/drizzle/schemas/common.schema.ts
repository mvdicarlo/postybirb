import { text } from 'drizzle-orm/sqlite-core';
import { v4 } from 'uuid';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { SubmissionType } from '../../../../../../libs/types/src/index';

export function commonSchema() {
  return {
    id: text()
      .primaryKey()
      .unique()
      .notNull()
      .$default(() => v4()),
    createdAt: text()
      .notNull()
      .$default(() => new Date().toISOString()),
    updatedAt: text()
      .notNull()
      .$default(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  };
}

export function submissionType() {
  return {
    submissionType: text({
      enum: [SubmissionType.FILE, SubmissionType.MESSAGE],
    }).notNull(),
  };
}
