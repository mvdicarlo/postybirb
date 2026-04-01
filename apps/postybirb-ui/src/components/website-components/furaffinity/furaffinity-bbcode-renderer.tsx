/* eslint-disable lingui/no-unlocalized-strings */
import { Box } from '@mantine/core';
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';
import { furaffinityBBCodeRenderToHTML } from './furaffinity-bbcode';

descriptionPreviewRendererByWebsite.set('fur-affinity', ({ description }) => {
  const view = furaffinityBBCodeRenderToHTML(description, {
    automaticParagraphs: true,
  });

  return <Box dangerouslySetInnerHTML={{ __html: view }} />;
});
