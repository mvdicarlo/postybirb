/**
 * @param {{
 *  websiteName: string;
 *  websiteUrl: string;
 *  submissionTypes: string[];
 *  fileFeatures: boolean;
 *  supportsTags: boolean;
 *  confirm: boolean;
 * }} answers
 */
export function parseAddWebsiteInput(answers) {
  const {
    websiteName,
    submissionTypes,
    websiteUrl,
    fileFeatures,
    supportsTags,
  } = answers;

  const website = websiteName.toLowerCase().trim();
  return {
    website,
    pascalWebsiteName: website
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(''),
    hasFile: submissionTypes.includes('file'),
    hasMessage: submissionTypes.includes('message'),
    websiteUrl,
    supportsTags,
  };
}

/**
 * @typedef {ReturnType<typeof parseAddWebsiteInput>} AddWebsiteContext
 */
