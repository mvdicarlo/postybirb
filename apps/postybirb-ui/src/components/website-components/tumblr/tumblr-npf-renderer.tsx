/* eslint-disable lingui/no-unlocalized-strings */
import { Box, Image, Stack, Text, Title } from '@mantine/core';
import {
  NPFContentBlock,
  NPFImageBlock,
  NPFLinkBlock,
  NPFTextBlock,
} from '@postybirb/types';
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';

descriptionPreviewRendererByWebsite.set('tumblr', ({ description }) => {
  if (!description) {
    return null;
  }

  let blocks: NPFContentBlock[];
  try {
    blocks = JSON.parse(description) as NPFContentBlock[];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse NPF description', e);
    return null;
  }

  if (!Array.isArray(blocks)) {
    return null;
  }

  // Group consecutive list items into proper <ul>/<ol> for cleaner rendering.
  // This is optional but improves semantics. For simplicity, we render each list item
  // as a separate block with proper styling (already done in renderTextBlock).
  // Here we just map every block to its component.
  const renderedBlocks = blocks.map((block, idx) => {
    const key = JSON.stringify(block);
    switch (block.type) {
      case 'text':
        return <Box key={key}>{renderTextBlock(block)}</Box>;
      case 'image':
        return <Box key={key}>{renderImageBlock(block)}</Box>;
      case 'link':
        return <Box key={key}>{renderLinkBlock(block)}</Box>;
      case 'audio':
      case 'video':
        return <Box key={key}>{renderOtherBlock(block)}</Box>;
      default:
        return null;
    }
  });

  return <Stack gap="xs">{renderedBlocks}</Stack>;
});

function renderTextBlock(block: NPFTextBlock): React.ReactNode {
  let { text } = block;
  const formatting = block.formatting || [];

  // Apply formatting in reverse order to preserve indices
  const sortedFormatting = [...formatting].sort((a, b) => b.start - a.start);
  for (const fmt of sortedFormatting) {
    const before = text.slice(0, fmt.start);
    const formattedText = text.slice(fmt.start, fmt.end);
    const after = text.slice(fmt.end);

    let wrapped = formattedText;
    switch (fmt.type) {
      case 'bold':
        wrapped = `<strong>${wrapped}</strong>`;
        break;
      case 'italic':
        wrapped = `<em>${wrapped}</em>`;
        break;
      case 'strikethrough':
        wrapped = `<del>${wrapped}</del>`;
        break;
      case 'small':
        wrapped = `<small>${wrapped}</small>`;
        break;
      case 'link':
        if (fmt.url) {
          wrapped = `<a href="${fmt.url}" target="_blank" rel="noopener noreferrer">${wrapped}</a>`;
        }
        break;
      case 'mention':
        // Mention could link to blog.tumblr.com/uuid – simplified: just render as text
        wrapped = `<span class="mention">@${wrapped}</span>`;
        break;
      case 'color':
        if (fmt.hex) {
          wrapped = `<span style="color: ${fmt.hex}">${wrapped}</span>`;
        }
        break;
      default:
        break;
    }
    text = `${before}${wrapped}${after}`;
  }

  // Replace newlines with <br/>
  text = text.replace(/\r?\n/g, '<br/>');

  // eslint-disable-next-line react/no-danger
  const innerHtml = <div dangerouslySetInnerHTML={{ __html: text }} />;

  // Apply block‑level styling based on subtype
  switch (block.subtype) {
    case 'heading1':
      return <Title order={1}>{innerHtml}</Title>;
    case 'heading2':
      return <Title order={2}>{innerHtml}</Title>;
    case 'quote':
      return (
        <Box
          component="blockquote"
          style={{
            margin: '0.5em 0',
            paddingLeft: '1rem',
            borderLeft: '3px solid var(--mantine-color-gray-4)',
            fontStyle: 'italic',
          }}
        >
          {innerHtml}
        </Box>
      );
    case 'indented':
      return (
        <Box style={{ marginLeft: `${(block.indent_level ?? 1) * 1.5}rem` }}>
          {innerHtml}
        </Box>
      );
    case 'ordered-list-item':
      return (
        <Box component="li" style={{ marginLeft: '1.5rem' }}>
          {innerHtml}
        </Box>
      );
    case 'unordered-list-item':
      return (
        <Box
          component="li"
          style={{ marginLeft: '1.5rem', listStyleType: 'disc' }}
        >
          {innerHtml}
        </Box>
      );
    default:
      return <Text>{innerHtml}</Text>;
  }
}

/**
 * Renders an NPF image block.
 */
function renderImageBlock(block: NPFImageBlock): React.ReactNode {
  const media = block.media[0];
  if (!media) return null;
  return (
    <Box my="xs">
      <Image
        src={media.url}
        alt={block.alt_text || ''}
        width={media.width}
        height={media.height}
        fit="contain"
      />
      {block.caption && (
        <Text size="sm" c="dimmed" mt={4}>
          {block.caption}
        </Text>
      )}
    </Box>
  );
}

/**
 * Renders a generic link block (card style).
 */
function renderLinkBlock(block: NPFLinkBlock): React.ReactNode {
  return (
    <Box
      component="a"
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: '8px',
        padding: '0.75rem',
        margin: '0.5rem 0',
        textDecoration: 'none',
        color: 'inherit',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      {block.poster?.[0] && (
        <Image
          src={block.poster[0].url}
          alt=""
          width={80}
          height={80}
          fit="cover"
          style={{ float: 'right', marginLeft: '0.75rem' }}
        />
      )}
      <Text fw={700}>{block.title || block.url}</Text>
      {block.description && (
        <Text size="sm" lineClamp={2}>
          {block.description}
        </Text>
      )}
      <Text size="xs" c="dimmed">
        {block.site_name || block.display_url || block.url}
      </Text>
    </Box>
  );
}

/**
 * Fallback for audio/video or other blocks.
 */
function renderOtherBlock(block: NPFContentBlock): React.ReactNode {
  if (block.type === 'audio') {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        🎵 Audio: {block.title || block.artist || 'untitled'}
      </Text>
    );
  }
  if (block.type === 'video') {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        📽️ Video: {block.provider || 'embedded'}
      </Text>
    );
  }
  return null;
}
