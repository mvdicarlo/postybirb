# Custom Websites Support

You can configure custom webhook URLs and field mappings for your custom integration. You need at least one URL (File URL for file submissions or Notification URL for text-only posts).

Custom website is for websites that you own and understand the actual backend of.

When you post PostyBirb will send the multipart form data to the url you specified with the headers you provided. It is advised to use the library to parse this data, e.g. multer for expressjs.

If you don't specify cutom batch size limit PostyBirb will send each file as separate request.

Each batch request will have all information like title, description, tags and rating regarding the order in batch.

All metadata (altText, sourceUrls) is tied to the file index.

Source code for the custom website integration can be found [here](../apps/client-server/src/app/websites/implementations/custom/custom.website.ts)

Below are few examples of what PostyBirb request will look like.

Default settings for a single image with custom specified source urls and alt text:

```
Headers:
{
  host: '(host of url you specify, e.g. localhost:8080)',
  connection: 'keep-alive',
  'content-length': '2562',
  'content-type': 'multipart/form-data; boundary=--------------------------6d23fc7a2a473f7b518c815c',
  'sec-fetch-site': 'none',
  'sec-fetch-mode': 'no-cors',
  'sec-fetch-dest': 'empty',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.205 Electron/35.7.5 Safari/537.36',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': '(your system language, e.g. en)'
}

Body:
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="title"

Stuck in thought
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="description"

<div>Familiar, isn&apos;t it? For VHSDragoness</div>
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="tags"

furry,art,furry_art,artwork,deer
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="rating"

GENERAL
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="file"; filename="2c95e03f-7dbc-44c1-befc-cddc06bf3c85.png"
Content-Type: image/png

(binary)
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="altText[0]"

Example alt text
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="sourceUrls[0]"

https://www.furaffinity.net/view/id/
----------------------------9f500d03850c97496d690075
Content-Disposition: form-data; name="sourceUrls[0]"

https://itaku.ee/images/id
----------------------------9f500d03850c97496d690075--
```

Example of what postybirb will send with batch limit set to 99999 in custom account settings and thumnbail field key set to 'thumbail' for two images with custom specified source urls and alt text on one of them:

```
Headers:
{
  host: '(host of url you specify, e.g. localhost:8080)',
  connection: 'keep-alive',
  'content-length': '5588',
  'content-type': 'multipart/form-data; boundary=--------------------------6d23fc7a2a473f7b518c815c',
  'sec-fetch-site': 'none',
  'sec-fetch-mode': 'no-cors',
  'sec-fetch-dest': 'empty',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.205 Electron/35.7.5 Safari/537.36',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': '(your system language, e.g. en)'
}
Body:
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="title"

Stuck in thought
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="description"

<div>Familiar, isn&apos;t it? For VHSDragoness</div>
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="tags"

furry,art,furry_art,artwork,deer
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="rating"

GENERAL
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="file"; filename="2c95e03f-7dbc-44c1-befc-cddc06bf3c85.png"
Content-Type: image/png

(binary)
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="file"; filename="28b91a61-8efa-428b-bced-8c398e5e64ae.png"
Content-Type: image/png

(binary)
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="altText[0]"

Example
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="thumbnail[0]"; filename="thumbnail_893404ad-e461-4301-aa6e-79b15c6712b1.png"
Content-Type: image/png

(binary)
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="sourceUrls[0]"

https://www.furaffinity.net/view/id/
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="sourceUrls[0]"

https://itaku.ee/images/id
----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="altText[1]"


----------------------------656075b90f0eb896fd278b7f
Content-Disposition: form-data; name="thumbnail[1]"; filename="thumbnail_9a9bfe22-d556-419f-833e-f105ff0eb511.png"
Content-Type: image/png

(binary)
----------------------------656075b90f0eb896fd278b7f--
```

Example of message submission:

```
Headers:
{
  host: '(host of url you specify, e.g. localhost:8080)',
  connection: 'keep-alive',
  'content-length': '794',
  'content-type': 'multipart/form-data; boundary=--------------------------49ba13444d70dc6b7cb7f3e8',
  'sec-fetch-site': 'none',
  'sec-fetch-mode': 'no-cors',
  'sec-fetch-dest': 'empty',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.205 Electron/35.7.5 Safari/537.36',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': '(your system language, e.g. en)'
}

Body:
----------------------------49ba13444d70dc6b7cb7f3e8
Content-Disposition: form-data; name="title"

Test title
----------------------------49ba13444d70dc6b7cb7f3e8
Content-Disposition: form-data; name="description"

<div>Description <span><b>with </b></span><a target="_blank" href="https://example.com"><span><b>formatting</b></span></a></div><div></div><div>Also supports <span><i>italic, </i></span><span><s>strikethrough</s></span><span><i>,</i></span> <span><u>underline</u></span> and more</div>
----------------------------49ba13444d70dc6b7cb7f3e8
Content-Disposition: form-data; name="tags"

tag1,tag2,tag3
----------------------------49ba13444d70dc6b7cb7f3e8
Content-Disposition: form-data; name="rating"

GENERAL
----------------------------49ba13444d70dc6b7cb7f3e8--
```
