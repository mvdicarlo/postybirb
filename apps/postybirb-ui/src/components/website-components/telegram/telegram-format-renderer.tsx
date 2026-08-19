/* eslint-disable lingui/no-unlocalized-strings */
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';
import { SafeHtml } from '../../shared/safe-html/safe-html';

descriptionPreviewRendererByWebsite.set('telegram', ({ description }) => {
  const parsed = JSON.parse(description) as {
    rendered: string;
  };

  return <SafeHtml html={parsed.rendered} />;
});
