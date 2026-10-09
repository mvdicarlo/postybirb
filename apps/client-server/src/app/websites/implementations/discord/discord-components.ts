export const DISCORD_COMPONENT_TEXT_LIMIT = 4000;

export type DiscordGalleryArrangement = 'grouped' | 'stacked' | 'cover';

const GALLERY_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

type TextDisplay = { type: 10; content: string };
type MediaGallery = {
  type: 12;
  items: {
    media: { url: string };
    description?: string;
    spoiler: boolean;
  }[];
};
type FileComponent = {
  type: 13;
  file: { url: string };
  spoiler: boolean;
};

type ComponentFile = {
  filename: string;
  mimeType: string;
  description?: string;
};

type ComponentOptions = {
  title: string;
  description: string;
  useTitle: boolean;
  isSpoiler?: boolean;
  mediaPosition?: 'above' | 'below';
  galleryArrangement?: DiscordGalleryArrangement;
};

export function getDiscordComponentHeading(title: string): string {
  const text = title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\\*_~`|[\]<>@]/g, '\\$&');
  return text ? `## ${text}` : '';
}

export function getDiscordComponentTextLength(
  options: Pick<ComponentOptions, 'title' | 'description' | 'useTitle'>,
): number {
  return (
    (options.useTitle ? getDiscordComponentHeading(options.title).length : 0) +
    (options.description.trim() ? options.description.length : 0)
  );
}

export function buildDiscordComponents(
  options: ComponentOptions,
  files: ComponentFile[] = [],
) {
  if (getDiscordComponentTextLength(options) > DISCORD_COMPONENT_TEXT_LIMIT) {
    throw new Error(
      `Discord component text exceeds ${DISCORD_COMPONENT_TEXT_LIMIT} characters, including the title.`,
    );
  }
  if (files.length > 10) {
    throw new Error('Discord supports up to 10 attachments per message.');
  }

  const mediaComponents: (MediaGallery | FileComponent)[] = [];
  let mediaCount = 0;
  files.forEach((file) => {
    if ((file.description?.length ?? 0) > 1024) {
      throw new Error(
        `Discord attachment alt text exceeds 1024 characters: ${file.filename}`,
      );
    }
    const media = { url: `attachment://${file.filename}` };
    const spoiler = options.isSpoiler ?? false;
    if (GALLERY_MIME_TYPES.has(file.mimeType)) {
      const item = {
        media,
        description: file.description || undefined,
        spoiler,
      };
      const previous = mediaComponents[mediaComponents.length - 1];
      const canGroup =
        options.galleryArrangement !== 'stacked' &&
        !(options.galleryArrangement === 'cover' && mediaCount === 1);
      if (previous?.type === 12 && canGroup) {
        previous.items.push(item);
      } else {
        mediaComponents.push({ type: 12, items: [item] });
      }
      mediaCount += 1;
    } else {
      mediaComponents.push({ type: 13, file: media, spoiler });
    }
  });

  const heading = options.useTitle
    ? getDiscordComponentHeading(options.title)
    : '';
  const title: TextDisplay[] = heading ? [{ type: 10, content: heading }] : [];
  const description: TextDisplay[] = options.description.trim()
    ? [{ type: 10, content: options.description }]
    : [];
  const components = [
    ...title,
    ...(options.mediaPosition === 'below'
      ? [...description, ...mediaComponents]
      : [...mediaComponents, ...description]),
  ];
  if (!components.length) {
    throw new Error('No content to post');
  }
  return {
    flags: 32768,
    allowed_mentions: { parse: ['everyone', 'users', 'roles'] },
    components: [{ type: 17, components }],
  };
}