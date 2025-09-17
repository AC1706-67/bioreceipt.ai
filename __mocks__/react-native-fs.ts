export const RNFSFileTypeRegular = 0;
export const DocumentDirectoryPath = "/tmp";
export const CachesDirectoryPath = "/tmp";

export const exists = jest.fn(async () => true);
export const mkdir = jest.fn(async () => undefined);
export const unlink = jest.fn(async () => undefined);
export const readFile = jest.fn(async () => "");
export const writeFile = jest.fn(async () => undefined);
export const stat = jest.fn(async () => ({ isFile: () => true, size: 0 }));

export default {
  RNFSFileTypeRegular,
  DocumentDirectoryPath,
  CachesDirectoryPath,
  exists,
  mkdir,
  unlink,
  readFile,
  writeFile,
  stat
};