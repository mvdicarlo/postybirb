import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { SubmissionArchive } from '../../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'submission-table',
  templateUrl: './submission-table.component.html',
  styleUrls: ['./submission-table.component.css']
})
export class SubmissionTableComponent implements OnInit, OnChanges {
  @Output() readonly clearAll: EventEmitter<any> = new EventEmitter();
  @Output() readonly postAll: EventEmitter<any> = new EventEmitter();

  @Input() rows: SubmissionArchive[] = [];
  @Input() allowPostAll: boolean = false;
  @Input() allowReorder: boolean = false;
  @Input() clearAllLabel: string = 'Clear All';

  constructor() { }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.rows) {
        this.rows = changes.rows.currentValue;
      }
    }
  }

  public doClearAll(): void {
    this.clearAll.emit();
  }

  public doPostAll(): void {
    this.postAll.emit();
  }

}
