/* eslint-disable lingui/no-unlocalized-strings */
import { Box } from '@mantine/core';
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';

descriptionPreviewRendererByWebsite.set('bluesky', ({ description }) => {
  const parsed = JSON.parse(description) as {
    text: string;
    links: { start: number; end: number; href: string }[];
  };

  let { text } = parsed;

  // Insert links, process in reverse order to avoid index shifting
  const sortedLinks = [...parsed.links].sort((a, b) => b.start - a.start);
  for (const link of sortedLinks) {
    const before = text.slice(0, link.start);
    const linkText = text.slice(link.start, link.end);
    const after = text.slice(link.end);
    text = `${before}<a href="${link.href}" target="_blank" rel="noopener noreferrer">${linkText}</a>${after}`;
  }

  text = text.replaceAll('\r\n', '<br/>');

  text = text.replaceAll(
    /#(\w+)/g,
    '<span style="color: var(--mantine-primary-color-filled)">#$1<span/>',
  );

  return <Box dangerouslySetInnerHTML={{ __html: text }} />;
});
