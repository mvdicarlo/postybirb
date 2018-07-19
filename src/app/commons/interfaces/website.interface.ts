import { WebsiteStatus } from '../enums/website-status.enum';
import { PostyBirbSubmissionData } from './posty-birb-submission-data.interface';
import { Observable } from 'rxjs';

/**
 * @interface
 * Interface used for every website model
 */
export interface Website {

  /**
   * @function getStatus
   * @async
   * @description queries the website to see if the user is logged in, logged out, or the website is offline
   */
  getStatus(): Promise<WebsiteStatus>;

  /**
   * @function getUser
   * @async
   * @description queries the website for the logged in username
   */
  getUser(): Promise<string>;

  /**
   * @function getOtherInfo
   * @description returns other info that doesn't fit directly into a standard function
   * @example returning a list of folders
   */
  getOtherInfo(): any;

  /**
   * @function getLoginStatus
   * @return {WebsiteStatus} return ths most recent login status query result
   */
  getLoginStatus(): WebsiteStatus;

  /**
   * @function post
   * @async
   * @description attempts to post a PostyBirb submission
   * @param {PostyBirbSubmissionData} submission
   */
  post(submission: PostyBirbSubmissionData): Observable<any>;

  /**
   * @function postJournal
   * @async
   * @description attempts to post a JournalBirb submission
   * @param {string} title - title of the journal/status where applicable
   * @param {string} description - description for the journal/status
   * @param {any} options - any additional options that the journal/status might require
   */
  postJournal(title: string, description: string, options?: any): Observable<any>;

  /**
   * @function unauthorize
   * @description unauthorizes a user from a website that uses authorization
   */
  unauthorize(): any;

  /**
   * @function authorize
   * @async
   */
  authorize(authInfo: any): Promise<any>;

  /**
   * @function checkAuthorized
   * @async
   */
  checkAuthorized(): Promise<boolean>;

  /**
   * @function refresh
   * @async
   * @description attempts to refresh the authorization of authorized websites
   */
  refresh(): Promise<any>;
}
