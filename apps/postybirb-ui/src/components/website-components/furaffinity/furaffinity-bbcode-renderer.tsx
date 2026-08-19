/* eslint-disable lingui/no-unlocalized-strings */
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';
import { SafeHtml } from '../../shared/safe-html/safe-html';
import { furaffinityBBCodeRenderToHTML } from './furaffinity-bbcode';

descriptionPreviewRendererByWebsite.set('fur-affinity', ({ description }) => {
  const view = furaffinityBBCodeRenderToHTML(description, {
    automaticParagraphs: true,
  });

  return <SafeHtml html={view} />;
});
