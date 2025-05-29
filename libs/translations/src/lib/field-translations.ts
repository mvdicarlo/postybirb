import { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/macro';

export const FieldLabelTranslations = {
  description: msg`Description`,
  tags: msg`Tags`,
  title: msg`Title`,
  rating: msg`Rating`,
  species: msg`Species`,
  contentWarning: msg`Content warning`,
  feature: msg`Feature`,
  spoiler: msg`Spoiler`,
  useTitle: msg`Use title`,
  critique: msg`Request critique`,
  notify: msg`Notify followers`,
  category: msg`Category`,
  folder: msg`Folder`,
  allowCommunityTags: msg`Allow other users to edit tags`,
  originalWork: msg`Original work`,
  hasSexualContent: msg`Has sexual content`,
  aIGenerated: msg`AI generated`,
  matureContent: msg`Mature content`,
  containsContent: msg`Contains content`,
  shareOnFeed: msg`Share on feed`,
  visibility: msg`Visibility`,
  channel: msg`Channel`,
  silent: msg`Silent`,
  allowComments: msg`Allow comments`,
  allowReblogging: msg`Allow reblogging`,
  replyToUrl: msg`Reply to post URL`,
  whoCanReply: msg`Who can reply`,
} satisfies Record<string, MessageDescriptor>;

export type FieldLabelTranslationsId = keyof typeof FieldLabelTranslations;
