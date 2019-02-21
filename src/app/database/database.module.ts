import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ThumbnailPipe } from './pipes/thumbnail.pipe';
import { ThumbnailFromFileIdPipe } from './pipes/thumbnail-from-file-id.pipe';

@NgModule({
  declarations: [
    ThumbnailPipe,
    ThumbnailFromFileIdPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ThumbnailPipe,
    ThumbnailFromFileIdPipe
  ]
})
export class DatabaseModule { }
