export interface HttpResponse<T> {
  body: T;
  statusCode: number;
  statusMessage: string;
  responseUrl: string;
}
