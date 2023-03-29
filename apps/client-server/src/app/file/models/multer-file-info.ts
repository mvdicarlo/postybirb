/**
 * Matches a multer file info object.
 * TypeScript is not importing multer types correctly.
 *
 * @interface MulterFileInfo
 */
export interface MulterFileInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
  origin?: 'directory-watcher';
}
