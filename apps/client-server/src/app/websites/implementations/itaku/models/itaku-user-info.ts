export type ItakuUserInfo = {
  profile: {
    id: number;
    owner_username: string;
    is_staff: boolean;
    is_moderator: boolean;
    bookmarked_by_you: boolean;
    you_follow: boolean;
    follows_you: boolean;
    email_verified: boolean;
    country: string;
    user_sites: string[];
    blacklisted: boolean;
    blocked: boolean;
    submission_notifs_muted: boolean;
    tags: string[];
    dms_allowed: boolean;
    num_followers: number;
    num_following: number;
    num_posts: number;
    num_gallery_images: number;
    has_unlisted_imgs_owner_only: boolean;
    num_commissions: number;
    num_joined: number;
    num_images_starred: number;
    num_bookmark_folders: number;
    num_reshares_given: number;
    num_comments_given: number;
    num_tags_suggestions: number;
    num_tags_edited: number;
    badge_counts: unknown[];
    displayname: string;
    comm_info: string;
    comm_tos: string;
    taking_comms: boolean;
    is_artist: boolean;
    date_added: string;
    date_edited: string;
    is_supporter: boolean;
    show_starred: boolean;
    show_following: boolean;
    enable_comments: boolean;
    lead: string;
    description: string;
    avatar: string;
    cover: string;
    avatar_sm: string;
    avatar_md: string;
    cover_sm: string;
    cover_lg: string;
    mature_profile: boolean;
    num_comments: number;
    owner: number;
    obj_tags: number;
    pinned_item: unknown;
  };
  meta: {
    hide_nsfw: boolean;
    hide_questionable: boolean;
    hide_nsfw_posts: boolean;
    hide_nsfw_tags: boolean;
    show_content_warnings: boolean;
    sfw_filters_by_default: boolean;
    reveal_nsfw: boolean;
    ad_mode: boolean;
    mute_submission_notifs: boolean;
    reshare_submission_notifs_muted: boolean;
    email_updates: boolean;
    following_only_dms: boolean;
    show_ads_as_supporter: boolean;
    hide_highlighted_comments: boolean;
    highlighted_comment_threshold: number;
    default_new_image_description: string;
    has_dismissed_event: boolean;
    submission_notifs_muted_users: string[];
    blacklisted_users: string[];
    blacklisted_tags: string[];
    blocked_users: string[];
  };
  nsfw_profile: unknown;
};
