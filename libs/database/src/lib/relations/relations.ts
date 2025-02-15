import { relations } from 'drizzle-orm';
import {
    AccountSchema,
    DirectoryWatcherSchema,
    FileBufferSchema,
    PostQueueRecordSchema,
    PostRecordSchema,
    SubmissionFileSchema,
    SubmissionSchema,
    UserSpecifiedWebsiteOptionsSchema,
    WebsiteDataSchema,
    WebsiteOptionsSchema,
    WebsitePostRecordSchema,
} from '../schemas';

export const AccountRelations = relations(AccountSchema, ({ one, many }) => ({
  websiteOptions: many(WebsiteOptionsSchema),
  websiteData: one(WebsiteDataSchema, {
    fields: [AccountSchema.id],
    references: [WebsiteDataSchema.id],
  }),
}));

export const DirectoryWatcherRelations = relations(
  DirectoryWatcherSchema,
  ({ one }) => ({
    template: one(SubmissionSchema, {
      fields: [DirectoryWatcherSchema.templateId],
      references: [SubmissionSchema.id],
    }),
  }),
);

export const PostQueueRecordRelations = relations(
  PostQueueRecordSchema,
  ({ one }) => ({
    submission: one(SubmissionSchema, {
      fields: [PostQueueRecordSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
    postRecord: one(PostRecordSchema, {
      fields: [PostQueueRecordSchema.postRecordId],
      references: [PostRecordSchema.id],
    }),
  }),
);

export const PostRecordRelations = relations(
  PostRecordSchema,
  ({ one, many }) => ({
    submission: one(SubmissionSchema, {
      fields: [PostRecordSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
    children: many(WebsitePostRecordSchema),
  }),
);

export const SubmissionFileRelations = relations(
  SubmissionFileSchema,
  ({ one }) => ({
    submission: one(SubmissionSchema, {
      fields: [SubmissionFileSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
    file: one(FileBufferSchema, {
      fields: [SubmissionFileSchema.primaryFileId],
      references: [FileBufferSchema.id],
    }),
    thumbnail: one(FileBufferSchema, {
      fields: [SubmissionFileSchema.thumbnailId],
      references: [FileBufferSchema.id],
    }),
    altFile: one(FileBufferSchema, {
      fields: [SubmissionFileSchema.altFileId],
      references: [FileBufferSchema.id],
    }),
  }),
);

export const SubmissionRelations = relations(
  SubmissionSchema,
  ({ one, many }) => ({
    options: many(WebsiteOptionsSchema),
    posts: many(PostRecordSchema),
    files: many(SubmissionFileSchema),
    postQueueRecord: one(PostQueueRecordSchema),
  }),
);

export const UserSpecifiedWebsiteOptionsRelations = relations(
  UserSpecifiedWebsiteOptionsSchema,
  ({ one }) => ({
    account: one(AccountSchema, {
      fields: [UserSpecifiedWebsiteOptionsSchema.accountId],
      references: [AccountSchema.id],
    }),
  }),
);

export const WebsiteDataRelations = relations(WebsiteDataSchema, ({ one }) => ({
  account: one(AccountSchema, {
    fields: [WebsiteDataSchema.id],
    references: [AccountSchema.id],
  }),
}));

export const WebsiteOptionsRelations = relations(
  WebsiteOptionsSchema,
  ({ one }) => ({
    account: one(AccountSchema, {
      fields: [WebsiteOptionsSchema.accountId],
      references: [AccountSchema.id],
    }),
    submission: one(SubmissionSchema, {
      fields: [WebsiteOptionsSchema.submissionId],
      references: [SubmissionSchema.id],
    }),
  }),
);

export const WebsitepostRecordRelations = relations(
  WebsitePostRecordSchema,
  ({ one }) => ({
    parent: one(PostRecordSchema, {
      fields: [WebsitePostRecordSchema.postRecordId],
      references: [PostRecordSchema.id],
    }),
    account: one(AccountSchema, {
      fields: [WebsitePostRecordSchema.accountId],
      references: [AccountSchema.id],
    }),
  }),
);
