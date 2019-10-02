import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Only needed for validator - might be worthwhile moving
// this out of the cache since it isn't used for much anymore.
import { WebsitesModule } from '../websites/websites.module';

import { ThumbnailFromFileIdPipe } from './pipes/thumbnail-from-file-id.pipe';
import { ThumbnailPipe } from './pipes/thumbnail.pipe';

@NgModule({
  declarations: [
    ThumbnailFromFileIdPipe,
    ThumbnailPipe,
  ],
  imports: [
    CommonModule,
    WebsitesModule
  ],
  exports: [
    ThumbnailFromFileIdPipe,
    ThumbnailPipe,
  ]
})
export class DatabaseModule { }
