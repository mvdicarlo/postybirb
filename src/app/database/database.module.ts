import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ThumbnailFromFileIdPipe } from './pipes/thumbnail-from-file-id.pipe';
import { ThumbnailPipe } from './pipes/thumbnail.pipe';

@NgModule({
  declarations: [
    ThumbnailFromFileIdPipe,
    ThumbnailPipe,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ThumbnailFromFileIdPipe,
    ThumbnailPipe,
  ]
})
export class DatabaseModule { }
