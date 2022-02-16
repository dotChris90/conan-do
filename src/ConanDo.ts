import * as child_process from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as fs_extra from 'fs-extra';

import * as Conan from './ConanTemplateGen';
import { Project } from './Project';


class PathHelper {
    public static copyIfExist(srcPath : string, dstPath : string) {
        if (fs.existsSync(srcPath)) {
            if (fs.existsSync(dstPath)) {
                fs_extra.copySync(srcPath,dstPath);
            }
        }
    }
}

export class ConanDo {
    public static installConan() : void {
        let cmd : string = "pip3 install --upgrade conan";
        child_process.execSync(
            cmd
        );
    }
    public static createTemplate(conanRoot : string = path.join(os.homedir(),".conan"), templateName : string = "default") : void {
        let generator = new Conan.ConanTemplateGen(conanRoot,templateName);
        let templateFiles = generator.generateTemplateFiles();
    }
    public static createNewProject(dirPath : string, project : Project, templateName : string) {
        let cmd = `conan new ${project.getFullName()} -m ${templateName}`;
        let out = child_process.execSync(
            cmd,
            {"cwd" : dirPath}
        );
    }
    public static importDepdendencies(projectRoot : string) {
        let buildDir = path.join(projectRoot,"build");
        fs.mkdirSync(
            buildDir,
            { recursive: true }
        );
        let cmd = "conan install -pr:h=default -pr:b=default -g deploy .. --build=missing";
        let out = child_process.execSync(
                    cmd,
                    {"cwd" : buildDir}
        );
        cmd = "conan install -pr:h=default -pr:b=default -g deploy ../test_package/ --build=missing";
        out = child_process.execSync(
            cmd,
            {"cwd" : buildDir}
        );
        let packages =  fs.readdirSync(buildDir, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() )
                            .filter(dirent => !(dirent.name === "include"))
                            .map(dirent => dirent.name);
        fs.mkdirSync(
            path.join(buildDir,"include"),
            {recursive : true}
        );
        packages.forEach(packageIdx => {
            let includeIdx = path.join(buildDir,packageIdx,"include");
            PathHelper.copyIfExist(includeIdx,path.join(buildDir,"include"));
        });
    }
}