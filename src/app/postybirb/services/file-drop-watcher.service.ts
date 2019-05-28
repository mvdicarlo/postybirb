import { Injectable } from '@angular/core';
import { fromEvent, Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileDropWatcherService {
  private isDragging: boolean = false;

  private dragStateSubject: Subject<boolean> = new Subject();
  public readonly onDragStateChange: Observable<boolean> = this.dragStateSubject.asObservable();

  private dropSubject: Subject<FileList> = new Subject();
  public readonly onDrop: Observable<FileList> = this.dropSubject.asObservable();

  constructor() {
    fromEvent(document, 'dragover').subscribe(this.dragover.bind(this));
    fromEvent(document, 'drop').subscribe(this.drop.bind(this));
    fromEvent(document, 'dragend').subscribe(this.dragend.bind(this));
  }

  // NOT READY
  private dragover(event: DragEvent): void {
    // event.preventDefault();
    // event.dataTransfer.effectAllowed = 'copy';
    // event.dataTransfer.dropEffect = 'copy';
    // if (event.dataTransfer && event.dataTransfer.items.length) {
    //   if (!this.isDragging) {
    //     this.isDragging = true;
    //     this.dragStateSubject.next(this.isDragging);
    //   }
    // } else {
    //   this.isDragging = false;
    //   this.dragStateSubject.next(this.isDragging);
    // }
  }

  private dragend(event: DragEvent): void {
    this.isDragging = false;
    this.dragStateSubject.next(this.isDragging);
  }

  private drop(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.files.length) {
      this.dropSubject.next(event.dataTransfer.files);
    }
  }
}
