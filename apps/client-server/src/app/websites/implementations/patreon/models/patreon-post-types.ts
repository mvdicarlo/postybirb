/**
 *{
    "data": {
        "id": "<number>",
        "type": "post",
        "attributes": {
            "post_type": "text_only",
            "post_metadata": null
        },
        "relationships": {
            "drop": {
                "data": null
            }
        }
    },
    "links": {
        "self": "https://www.patreon.com/api/posts/<number>"
    }
}
 *
 */
export interface PatreonNewPostResponse {
  data: {
    id: string;
    type: 'post';
    attributes: {
      post_type: string;
      post_metadata: unknown;
    };
    relationships: {
      drop: {
        data: object;
      };
    };
  };
  links: {
    self: string;
  };
}
