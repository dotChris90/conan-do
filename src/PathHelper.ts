import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';

export class PathHelper {
    public static createDir(dirPath : string)  {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(
                dirPath,
                { recursive: true }
            );
        }
    };
    public static rmDir(dirPath : string) {
        if (fs.existsSync(dirPath)) {
            fs.rmdirSync(dirPath, { recursive: true });
        }
    };
    public static createFile(dirPath : string, fileName : string, content : string) : string {
        fs.writeFileSync(
            path.join(
                dirPath,
                fileName
            ),
            content
        );
        return path.join(dirPath,fileName);
    };
    public static rmIfExist(filePath : string) {
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath);
        }
    }
}