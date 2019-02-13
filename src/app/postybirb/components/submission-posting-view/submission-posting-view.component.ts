import { Component, OnInit, Input } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { PostQueueService } from '../../services/post-queue.service';

@Component({
  selector: 'submission-posting-view',
  templateUrl: './submission-posting-view.component.html',
  styleUrls: ['./submission-posting-view.component.css']
})
export class SubmissionPostingViewComponent implements OnInit {
  @Input() submission: Submission;

  public status: any = new Date();

  constructor(private _postQueue: PostQueueService) { }

  ngOnInit() {
  }

  public cancel(): void {
    this._postQueue.dequeue(this.submission.id);
  }

}
