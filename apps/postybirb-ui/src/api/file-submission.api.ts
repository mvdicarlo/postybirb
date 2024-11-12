import { EntityId, ISubmissionDto, SubmissionId } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

export type FileUpdateTarget = 'file' | 'thumbnail';

class FileSubmissionsApi {
  private readonly client: HttpClient = new HttpClient('file-submission');

  appendFiles(id: SubmissionId, target: FileUpdateTarget, files: Blob[]) {
    const fd = new FormData();
    files.forEach((file) => fd.append('files', file));
    return this.client.post<ISubmissionDto>(`add/${target}/${id}`, fd);
  }

  replaceFile(
    id: SubmissionId,
    fileId: EntityId,
    target: FileUpdateTarget,
    file: Blob,
  ) {
    const fd = new FormData();
    fd.append('file', file);
    return this.client.post(`replace/${target}/${id}/${fileId}`, fd);
  }

  removeFile(id: SubmissionId, fileId: EntityId, target: FileUpdateTarget) {
    return this.client.delete<ISubmissionDto>(
      `remove/${target}/${id}/${fileId}`,
    );
  }

  getAltText(id: EntityId) {
    return this.client.get<{ type: string; data: number[] }>(`alt/${id}`);
  }
}

export default new FileSubmissionsApi();

export function getRemoveFileUrl(
  id: SubmissionId,
  fileId: EntityId,
  target: FileUpdateTarget,
): string {
  return `api/file-submission/remove/${target}/${id}/${fileId}`;
}

export function getReplaceFileUrl(
  id: SubmissionId,
  fileId: EntityId,
  target: FileUpdateTarget,
): string {
  return `api/file-submission/replace/${target}/${id}/${fileId}`;
}

export function getAppendFileUrl(
  id: SubmissionId,
  target: FileUpdateTarget,
): string {
  return `api/file-submission/add/${target}/${id}`;
}
