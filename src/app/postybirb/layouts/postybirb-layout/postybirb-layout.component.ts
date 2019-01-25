import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material';
import { readFile, ReadFile } from 'src/app/utils/helpers/file-reader.helper';

@Component({
  selector: 'postybirb-layout',
  templateUrl: './postybirb-layout.component.html',
  styleUrls: ['./postybirb-layout.component.css']
})
export class PostybirbLayout implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;
  public loading: boolean = false;

  constructor(private _route: Router, private dialog: MatDialog) { }

  ngOnInit() {
  }

  public createNewSubmission(): void {

  }

  public createNewJournal(): void {

  }

  public createNewTemplate(): void {
    this._route.navigateByUrl('/template');
    // TODO implement actual template stuff
  }

  public filesSelected(event: Event): void {
    event.stopPropagation()
    event.preventDefault();
    this.loading = true;

    const files: File[] = event.target['files'];

    if (files && files.length) {
      const loadPromises: Promise<ReadFile>[] = [];
      for (let i = 0; i < files.length; i++) {
          loadPromises.push(readFile(files[i]));
      }

      Promise.all(loadPromises)
      .then(results => {
        this.loading = false;
      });
    }

    this.fileInput.nativeElement.value = '';
  }

}
