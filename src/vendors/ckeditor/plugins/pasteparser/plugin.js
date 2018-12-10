/*
* Custom parser made to filter out pasted text the editor won't like
*/

( function() {
	'use strict';

	CKEDITOR.plugins.add( 'pasteparser', {
		requires: 'clipboard',

		init: function( editor ) {
			editor.on( 'paste', function( evt ) {
				var data = evt.data.dataValue;

				if ( data.indexOf( '<' ) > -1 ) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, "text/html");
            const body = doc.getElementsByTagName('body')[0];
            const pTags = $(body).find('p, div, h1, h2, h3, h4, h5, h6, pre, fieldset, form, hr');
            $(pTags).each(function() {
              $(this).replaceWith(this.innerHTML + '<br>');
            });

            const imgTags = $(body).find('img, video, audio, script');
            $(imgTags).each(function() {
              $(this).replaceWith('');
            });

            const bTags = $(body).find('*[id*="docs-internal"]');
            $(bTags).each(function() {
              $(this).replaceWith(this.innerHTML);
            });

            data = body.innerHTML;
          } catch (e) {
            console.warn('Unable to parse pasted content', e);
            return;
          }
				} else {
          return;
        }

				// If link was discovered, change the type to 'html'. This is important e.g. when pasting plain text in Chrome
				// where real type is correctly recognized.
				if ( data != evt.data.dataValue ) {
					evt.data.type = 'html';
				}

				evt.data.dataValue = data;
			} );
		}
	} );
} )();
