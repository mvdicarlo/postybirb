import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ThumbnailPipe } from './pipes/thumbnail.pipe';

@NgModule({
  declarations: [
    ThumbnailPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ThumbnailPipe
  ]
})
export class DatabaseModule { }
