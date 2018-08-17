import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TourService } from 'ngx-tour-ngx-bootstrap';

@Component({
  selector: 'posty-birb-app',
  templateUrl: './posty-birb-app.component.html',
  styleUrls: ['./posty-birb-app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostyBirbAppComponent {

  constructor(private tourService: TourService) {
    this.tourService.initialize([{
      anchorId: 'start.tour',
      content: 'Welcome to PostyBirb!',
      placement: 'bottom',
      title: 'Getting Started'
    }, {
      anchorId: 'pb.submissionview',
      content: 'Click here to view any saved submissions.',
      placement: 'top',
      title: 'The Submission View'
    }, {
      anchorId: 'pb.submission.settings',
      content: 'You can also click here to change some basic posting settings.',
      placement: 'top',
      title: 'Submission/Posting Settings'
    }, {
      anchorId: 'pb.add.file',
      content: 'Start a submission by clicking or dropping file(s) here!',
      placement: 'bottom',
      title: 'Starting a Submission'
    }, {
      anchorId: 'pb.add.clipboard',
      content: 'Or copy in an image from your clipboard by clicking here.',
      placement: 'bottom',
      title: 'Clipboard Usage'
    }, {
      stepId: 'pb.card.info',
      anchorId: 'pb.card.info',
      content: 'Fill out some basic information about your submission. A rating is required.',
      placement: 'bottom',
      title: 'Basic Information'
    }, {
      anchorId: 'pb.card.schedule',
      content: 'You can schedule a time for the submission to post at by clicking here.',
      placement: 'right',
      title: 'Scheduling'
    }, {
      anchorId: 'pb.card.additional',
      content: 'You can also add additional images to the submission. Currently this is only Inkbunny, Pixiv, Tumblr, and Twitter.',
      placement: 'right',
      title: 'Additional Images'
    }, {
      anchorId: 'pb.card.ordering',
      content: 'You can order your additional images by clicking here.',
      placement: 'right',
      title: 'Ordering Additional Images'
    }, {
      anchorId: 'pb.card.actions',
      content: 'Additional actions can be found clicking here.',
      placement: 'right',
      title: 'Additional Actions'
    }, {
      anchorId: 'pb.card.select',
      content: 'Once you have provided a rating, click here to edit the submission further.',
      placement: 'bottom',
      title: 'Further Editing'
    }, {
      stepId: 'pb.edit.websites',
      anchorId: 'pb.edit.websites',
      content: 'You are now ready to select which websites to post to. You must first login to the website(s). You can do this by clicking on "Login" at the top-left corner of the app.',
      placement: 'top',
      title: 'Selecting Websites'
    }, {
      stepId: 'pb.edit.description',
      anchorId: 'pb.edit.description',
      content: 'Set a default description that will be used for all selected websites unless overwritten further down the form. This field accepts BBCode. For more direct control of content toggle "Use basic editor."',
      placement: 'top',
      title: 'Default Description'
    }, {
      anchorId: 'pb.edit.tags',
      content: 'Set default tags for each selected website. You can customize or override individual website tags further down the form.',
      placement: 'top',
      title: 'Default Tags'
    }, {
      anchorId: 'pb.edit.custom',
      content: 'This is where you can customize options, tags, and descriptions for each selected website. If a label is marked red then it means that you must meet the website\'s requirements (e.g. tag count).',
      placement: 'top',
      title: 'Customizing Websites'
    }, {
      anchorId: 'pb.edit.template.save',
      content: 'If you think you might frequently use certain descriptions, tags, and other options, you can save them into a template for re-use in the future.',
      placement: 'top',
      title: 'Creating Templates'
    }, {
      anchorId: 'pb.edit.template.load',
      content: 'Select a template from here and it will load it into the current form. You should do this first, since it will overwrite the current form.',
      placement: 'top',
      title: 'Loading Templates'
    }, {
      anchorId: 'pb.edit.saving',
      content: 'When done filling out the form, click here.',
      placement: 'top',
      title: 'Saving Your Submission'
    }, {
      stepId: 'pb.submission.validate',
      anchorId: 'pb.submission.validate',
      content: 'This screen will show you any problems your submission may have posting to the selected websites. Those marked in red will be excluded from being posted to. You can hover over the icons to see what is causing a conflict.',
      placement: 'top',
      title: 'Submission Validating'
    }, {
      anchorId: 'pb.submission.yes',
      content: 'Clicking "Yes" will send the submission to the Submission Gallery.',
      placement: 'top',
      title: 'Saving The Submission'
    }, {
      anchorId: 'pb.submission.post',
      content: 'Clicking "Post" will immediately begin posting the submission. This can be cancelled in the Submission Gallery.',
      placement: 'top',
      title: 'Saving The Submission'
    }, {
      stepId: 'pb.submissionview.overview',
      anchorId: 'pb.submissionview.overview',
      content: 'This is the Submission View. This is where all your submissions are stored once you have saved them.',
      placement: 'top',
      title: 'Submission View'
    }, {
      anchorId: 'pb.submissionview.ad',
      content: 'Like PostyBirb? Feel free to leave this on to help spread awareness of the app. This will append a message "Posted using PostyBirb" to the very bottom of all of your posts. This will not apply to e621, Derpibooru, and Twitter (if the description would be more than 280 characters).',
      placement: 'top',
      title: 'Get The Word Out'
    }, {
      anchorId: 'pb.submissionview.emergency',
      content: 'Need to stop posting immediately? Hit this. It will completely reload the app, stopping any in-flight submissions. This will not delete any submissions already made so it is your job to do clean up.',
      placement: 'top',
      title: 'Emergency Stop'
    }, {
      anchorId: 'pb.submissionview.unscheduled',
      content: 'Submissions that are not scheduled will appear in this tab.',
      placement: 'top',
      title: 'Unscheduled Submissions'
    }, {
      anchorId: 'pb.submissionview.scheduled',
      content: 'Submissions that are scheduled will appear in this tab.',
      placement: 'top',
      title: 'Scheduled Submissions'
    }, {
      anchorId: 'pb.submissionview.queue',
      content: 'Submissions that are queued to post will appear in this tab, as well as in their respective tab. Submissions post one after the other. Sometimes a submission may be forced to wait due to captcha or posting interval specified in settings.',
      placement: 'top',
      title: 'Queued Submissions'
    }, {
      anchorId: 'pb.submissionview.logs',
      content: 'After each submission a log will be generated (only 5 are stored at a time). If your submissions is failing to post and you think it is a bug, download the log for the submission and drop it into the discord or email it to me.',
      placement: 'top',
      title: 'Submission Logs'
    }]);

    this.tourService.anchorRegister$.subscribe(function(stepName) {
      if (!db.get('tutorial').value()) return;

      if (stepName === 'pb.card.info') {
        this.tourService.startAt('pb.card.info');
      }

      if (stepName === 'pb.edit.websites' || stepName == 'pb.edit.description') {
        this.tourService.startAt('pb.edit.websites');
      }

      if (stepName === 'pb.submission.validate') {
        this.tourService.startAt('pb.submission.validate');
      }

      if (stepName === 'pb.submissionview.overview') {
        this.tourService.startAt('pb.submissionview.overview');
      }
    }.bind(this));

    const allowTutorial = db.get('tutorial').value();
    if (allowTutorial === undefined || allowTutorial) {
      this.tourService.start();
    }
  }

}
