/* eslint-disable lingui/no-unlocalized-strings */
import { Editor } from '@tinymce/tinymce-react';
import sanizeHtml from 'sanitize-html';
// TinyMCE so the global var exists
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import tinymce, { RawEditorOptions } from 'tinymce/tinymce';
// DOM model
import 'tinymce/models/dom/model';
// Theme
import 'tinymce/themes/silver';
// Toolbar icons
import 'tinymce/icons/default';
// Editor styles
import 'tinymce/skins/ui/oxide-dark/skin.min.css';

// importing the plugin js.
// if you use a plugin that is not listed here the editor will fail to load
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/autosave';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/code';
import 'tinymce/plugins/codesample';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/emoticons';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/help';
import 'tinymce/plugins/image';
import 'tinymce/plugins/importcss';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/media';
import 'tinymce/plugins/nonbreaking';
import 'tinymce/plugins/pagebreak';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/quickbars';
import 'tinymce/plugins/save';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/table';
import 'tinymce/plugins/template';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/visualchars';
import 'tinymce/plugins/wordcount';
// import './plugins/autoshortcut/index';

if (tinymce) {
  // Loading trick
}

const tinyMceSettings: RawEditorOptions = {
  content_css: false,
  promotion: false,
  inline: false,
  statusbar: false,
  paste_data_images: false,
  browser_spellcheck: true,
  entity_encoding: 'raw',
  paste_retain_style_properties: 'color',
  invalid_elements: 'img,audio,video',
  block_formats:
    'Paragraph=p;Header 1=h1;Header 2=h2;Header 3=h3;Header 4=h4;Header 5=h5;Header 6=h6',
  content_style: `p {margin: 0}*
    {font-family: arial}
    shortcut {color: salmon}
    shortcut-name {color: blue}
    shortcut-attributes {color: red}
    shortcut-value {color: grey}`,
  height: 200,
  plugins: [
    'autoresize',
    'autolink',
    'link',
    'preview',
    'paste',
    'hr',
    'template',
    'help',
    'code',
    'lists',
    // 'autoshortcut',
  ],
  menubar: 'edit help',
  toolbar: [
    { name: 'history', items: ['undo', 'redo'] },
    { name: 'styles', items: ['styles'] },
    {
      name: 'formatting',
      items: ['bold', 'italic', 'underline', 'strikethrough', 'forecolor'],
    },
    {
      name: 'alignment',
      items: ['alignleft', 'aligncenter', 'alignright', 'alignjustify'],
    },
    { name: 'other', items: ['link', 'unlink', 'hr', 'code'] },
  ],
  formats: {
    bold: { inline: 'b', exact: true },
    underline: { inline: 'u', exact: true },
    strikethrough: { inline: 's', exact: true },
  },
  paste_preprocess(plugin, args) {
    // eslint-disable-next-line no-param-reassign
    args.content = sanizeHtml(args.content, {
      allowedTags: false,
      allowedAttributes: {
        a: ['href', 'target'],
        div: ['align', 'style'],
        pre: ['align', 'style'],
        p: ['align', 'style'],
        h1: ['align', 'style'],
        h2: ['align', 'style'],
        h3: ['align', 'style'],
        h4: ['align', 'style'],
        h5: ['align', 'style'],
        h6: ['align', 'style'],
        span: ['align', 'style'],
      },
      allowedStyles: {
        '*': {
          'text-align': [/.*/],
        },
      },
    });
  },
  // custom_elements: '~shortcut,~shortcut-name,~shortcut-attributes,~shortcut-value',
};

type PostyBirbEditorProps = {
  inline?: boolean;
  value: string;
  onChange: (newValue: string) => void;
};

export function PostyBirbEditor(props: PostyBirbEditorProps) {
  const { inline, value, onChange } = props;
  // note that skin and content_css is disabled to avoid the normal
  // loading process and is instead loaded as a string via content_style
  const settings = { ...tinyMceSettings, inline: !!inline };
  return (
    <Editor
      init={settings as never}
      onInit={(_, editor) => {
        if (inline) {
          editor.bodyElement?.classList.add(
            ...'euiFieldText euiFieldText--fullWidth euiFieldText--compressed'.split(
              ' '
            )
          );
        }
      }}
      value={value || ''}
      onEditorChange={(newValue) => {
        onChange(newValue);
      }}
    />
  );
}
