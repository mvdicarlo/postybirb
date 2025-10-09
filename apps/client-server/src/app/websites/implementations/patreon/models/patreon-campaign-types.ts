/**
 * Patreon API Campaign Response Types
 */

export interface PatreonCampaignResponse {
  data: PatreonCampaign;
  included?: Array<PatreonUser | PatreonReward | PatreonAccessRule>;
  links: {
    self: string;
  };
}

export interface PatreonCampaign {
  id: string;
  type: 'campaign';
  attributes: PatreonCampaignAttributes;
  relationships: PatreonCampaignRelationships;
}

export interface PatreonCampaignAttributes {
  avatar_photo_image_urls: Record<
    | 'original'
    | 'default'
    | 'default_small'
    | 'default_large'
    | 'default_blurred'
    | 'default_blurred_small'
    | 'thumbnail'
    | 'thumbnail_large'
    | 'thumbnail_small',
    string
  >;
  avatar_photo_url: string;
  campaign_pledge_sum: number;
  cover_photo_url: string;
  cover_photo_url_sizes: Record<
    'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'low_quality',
    string
  >;
  created_at: string;
  creation_count: number;
  creation_name: string;
  currency: string;
  discord_server_id: string | null;
  display_patron_goals: boolean;
  earnings_visibility: 'public' | 'private';
  image_small_url: string;
  image_url: string;
  is_charge_upfront: boolean;
  is_charged_immediately: boolean;
  is_monthly: boolean;
  is_new_fandom: boolean;
  is_nsfw: boolean;
  is_plural: boolean;
  main_video_embed: string | null;
  main_video_url: string | null;
  name: string;
  one_liner: string | null;
  outstanding_payment_amount_cents: number;
  paid_member_count: number;
  patron_count: number;
  pay_per_name: string;
  pledge_sum: number;
  pledge_sum_currency: string;
  pledge_url: string;
  published_at: string | null;
  should_display_chat_tab: boolean;
  summary: string;
  thanks_embed: string | null;
  thanks_msg: string | null;
  thanks_video_url: string | null;
  url: string;
}

export interface PatreonCampaignRelationships {
  creator: PatreonRelationship<'user'>;
  goals: {
    data: PatreonRelationshipData<'goal'> | null;
  };
  rewards: {
    data: Array<PatreonRelationshipData<'reward'>>;
  };
}

export interface PatreonUser {
  id: string;
  type: 'user';
  attributes: PatreonUserAttributes;
  relationships: {
    campaign: PatreonRelationship<'campaign'>;
  };
}

export interface PatreonUserAttributes {
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: number;
  is_email_verified: boolean;
  vanity: string;
  about: string | null;
  apple_id: string | null;
  facebook_id: string | null;
  discord_id: string | null;
  google_id: string | null;
  image_url: string;
  thumb_url: string;
  youtube: string | null;
  twitter: string | null;
  facebook: string | null;
  twitch: string | null;
  is_suspended: boolean;
  is_deleted: boolean;
  is_nuked: boolean;
  can_see_nsfw: boolean;
  created: string;
  url: string;
  has_password: boolean;
  social_connections: PatreonSocialConnections;
  default_country_code: string | null;
  patron_currency: string;
  age_verification_status: string | null;
  current_user_block_status: 'none' | 'blocked' | 'blocking';
}

export interface PatreonSocialConnections {
  discord: PatreonDiscordConnection | null;
  facebook: PatreonSocialConnection | null;
  google: PatreonSocialConnection | null;
  instagram: PatreonSocialConnection | null;
  reddit: PatreonSocialConnection | null;
  spotify: PatreonSocialConnection | null;
  spotify_open_access: PatreonSocialConnection | null;
  tiktok: PatreonSocialConnection | null;
  twitch: PatreonSocialConnection | null;
  twitter: PatreonSocialConnection | null;
  twitter2: PatreonSocialConnection | null;
  vimeo: PatreonSocialConnection | null;
  youtube: PatreonSocialConnection | null;
}

export interface PatreonDiscordConnection {
  user_id: string;
  scopes: string[];
}

export type PatreonSocialConnection = Record<string, unknown> | null;

export interface PatreonReward {
  id: string;
  type: 'reward';
  attributes: PatreonRewardAttributes;
  relationships?: {
    campaign: PatreonRelationship<'campaign'>;
  };
}

export interface PatreonAccessRule {
  id: string;
  type: 'access-rule';
  attributes: {
    access_rule_type:
      | 'patrons'
      | 'public'
      | 'min_cents_pledged'
      | 'non_member'
      | 'tier';
  };
  relationships: {
    tier: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

export interface PatreonRewardAttributes {
  amount: number;
  amount_cents: number;
  user_limit: number | null;
  remaining: number | null;
  description: string;
  requires_shipping: boolean;
  created_at: string | null;
  url: string | null;
  declined_patron_count?: number;
  patron_count?: number;
  post_count?: number;
  discord_role_ids: string[] | null;
  title?: string;
  image_url: string | null;
  edited_at?: string;
  published?: boolean;
  published_at?: string | null;
  unpublished_at?: string | null;
  currency?: string;
  patron_amount_cents?: number;
  patron_currency: string;
  welcome_message?: string | null;
  welcome_message_unsafe?: string | null;
  welcome_video_url?: string | null;
  welcome_video_embed?: string | null;
  is_free_tier?: boolean;
}

// Generic relationship types
export interface PatreonRelationship<T extends string> {
  data: PatreonRelationshipData<T> | PatreonRelationshipData<T>[] | null;
  links?: {
    related: string;
  };
}

export interface PatreonRelationshipData<T extends string> {
  id: string;
  type: T;
}
