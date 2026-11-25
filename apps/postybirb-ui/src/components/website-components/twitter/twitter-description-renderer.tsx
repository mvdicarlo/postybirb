/* eslint-disable lingui/no-unlocalized-strings */
import twitterText from 'twitter-text';
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';
import { SafeHtml } from '../../shared/safe-html/safe-html';

export function twitterDescriptionRenderer({
  description,
}: {
  description: string;
}) {
  // Description is plain text, no JSON
  const html = twitterText
    .autoLinkEntities(description, twitterText.extractEntitiesWithIndices(description), {
      targetBlank: true,
      // Style urls, #hashtags, @mentions and $cashtags the same way
      linkAttributeBlock: (_entity, attributes) => {
        // eslint-disable-next-line no-param-reassign
        attributes.style = 'color: var(--mantine-primary-color-filled)';
        // eslint-disable-next-line no-param-reassign
        attributes.rel = 'noopener noreferrer';
      },
    })
    .replaceAll(/\r?\n/g, '<br/>');


  return <SafeHtml html={html} />;
}

descriptionPreviewRendererByWebsite.set('twitter', twitterDescriptionRenderer);
