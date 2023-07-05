import { EntityId, ISubmissionDto, SubmissionId } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

type Target = 'file' | 'thumbnail';

class FileSubmissionsApi {
  private readonly client: HttpClient = new HttpClient('file-submission');

  appendFiles(id: SubmissionId, target: Target, files: Blob[]) {
    const fd = new FormData();
    files.forEach((file) => fd.append('files', file));
    this.client.post<ISubmissionDto>(`add/${target}/${id}`, fd);
  }

  replaceFile(id: SubmissionId, fileId: EntityId, target: Target, file: Blob) {
    const fd = new FormData();
    fd.append('file', file);
    return this.client.post(`replace/${target}/${id}/${fileId}`, fd);
  }

  removeFile(id: SubmissionId, fileId: EntityId, target: Target) {
    return this.client.delete<ISubmissionDto>(
      `remove/${target}/${id}/${fileId}`
    );
  }
}

export default new FileSubmissionsApi();

export function getRemoveFileUrl(
  id: SubmissionId,
  fileId: EntityId,
  target: Target
): string {
  return `api/file-submission/remove/${target}/${id}/${fileId}`;
}

export function getReplaceFileUrl(
  id: SubmissionId,
  fileId: EntityId,
  target: Target
): string {
  return `api/file-submission/replace/${target}/${id}/${fileId}`;
}

export function getAppendFileUrl(id: SubmissionId, target: Target): string {
  return `api/file-submission/add/${target}/${id}`;
}
