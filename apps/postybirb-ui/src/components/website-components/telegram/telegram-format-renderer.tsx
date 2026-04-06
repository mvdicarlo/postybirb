/* eslint-disable lingui/no-unlocalized-strings */
import { Box } from '@mantine/core';
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';

descriptionPreviewRendererByWebsite.set('telegram', ({ description }) => {
  const parsed = JSON.parse(description) as {
    rendered: string;
  };

  return <Box dangerouslySetInnerHTML={{ __html: parsed.rendered }} />;
});
