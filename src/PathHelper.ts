import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import * as fs_extra from 'fs-extra';

export class PathHelper {
    static fileHelper = class {
        public static createFile(dirPath: string, fileName: string, content: string): string {
            fs.writeFileSync(
                path.join(
                    dirPath,
                    fileName
                ),
                content
            );
            return path.join(dirPath, fileName);
        };
        public static copyIfExist(srcPath: string, dstPath: string) {
            if (fs.existsSync(srcPath)) {
                if (fs.existsSync(dstPath)) {
                    fs_extra.copySync(srcPath, dstPath);
                }
            }
        }
        public static rmIfExist(filePath: string) {
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath);
            }
        }
    };
    static dirHelper = class {
        public static createDir(dirPath: string) {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(
                    dirPath,
                    { recursive: true }
                );
            }
        };
        public static rmDir(dirPath: string) {
            if (fs.existsSync(dirPath)) {
                fs_extra.rmdirSync(dirPath, { recursive: true });
            }
        };
    };
}
