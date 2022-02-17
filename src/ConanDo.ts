import * as child_process from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as fs_extra from 'fs-extra';
import * as cliProgress from 'cli-progress';
import * as vscode from 'vscode';

import * as Conan from './ConanTemplateGen';
import { Project } from './Project';
import {ILog} from './ILog';

class PathHelper {
    public static copyIfExist(srcPath : string, dstPath : string) {
        if (fs.existsSync(srcPath)) {
            if (fs.existsSync(dstPath)) {
                fs_extra.copySync(srcPath,dstPath);
            }
        }
    }
    public static rmDir(dirPath : string) {
        if (fs.existsSync(dirPath)) {
            fs.rmdirSync(dirPath, { recursive: true });
        }
    };
    public static rmFileIfExist(filePath : string) {
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath);
        }
    };
}

export class ConanDo {
    private log : ILog;
    private conanRoot : string;
    constructor(log : ILog, conanRoot : string) {
        this.log = log;
        this.conanRoot = conanRoot;
    }
    public installConan() : void {
        let cmd : string = "pip3 install --upgrade conan";
        let out = child_process.execSync(
            cmd
        );
        this.log.writeOut(out.toString());
    }
    public createTemplate(templateName : string = "default") : void {
        let generator = new Conan.ConanTemplateGen(this.conanRoot,templateName);
        let templateFiles = generator.generateTemplateFiles();
    }
    public createNewProject(dirPath : string, project : Project, templateName : string) {
        let cmd = `conan new ${project.getFullName()} -m ${templateName}`;
        let out = child_process.execSync(
            cmd,
            {"cwd" : dirPath}
        );
        cmd = `chmod +x ${path.join(dirPath,".vscode","build.sh")}`;
        out = child_process.execSync(
            cmd
        );
        cmd = `chmod +x ${path.join(dirPath,".vscode","build_test.sh")}`;
        out = child_process.execSync(
            cmd
        );
    }
    public importDepdendencies(projectRoot : string) {
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
        this.log.writeOut(out.toString());

        cmd = "conan install -pr:h=default -pr:b=default -g deploy ../test_package/ --build=missing";
        out = child_process.execSync(
            cmd,
            {"cwd" : buildDir}
        );
        this.log.writeOut(out.toString());

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
        this.log.writeOut(`Header now present at : ${path.join(buildDir,"include")}`);
    }
    public getProfiles() : string[] {
        let cmd = "conan profile list";
        let out = child_process.execSync(
            cmd
        );
        let profiles = out.toString().split("\n").filter(text => text !== '');
        profiles.unshift("default");
        return profiles;
    }
    public buildRelease(projectRoot : string, buildProfile : string, hostProfile : string) {
        let buildDir = path.join(projectRoot,"build");
        fs.mkdirSync(
            buildDir,
            { recursive: true }
        );
        PathHelper.rmFileIfExist(path.join(buildDir,"conanbuildinfo.txt"));
        PathHelper.rmFileIfExist(path.join(buildDir,"conaninfo.txt"));
        PathHelper.rmFileIfExist(path.join(buildDir,"conan.lock"));
        PathHelper.rmFileIfExist(path.join(buildDir,"graph_info.json"));
        let cmakeBuildDirs =  fs.readdirSync(projectRoot, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() )
                            .filter(dirent => dirent.name === "cmake-build-release")
                            .map(dirent => dirent.name);
        cmakeBuildDirs.forEach(cmakeBuildDir => {
            PathHelper.rmDir(cmakeBuildDir);   
        });
        let cmd = `conan install -pr:h=${hostProfile} -pr:b=${buildProfile} -s build_type=Release .. --build=missing`;
        let out = child_process.execSync(
            cmd,
            {"cwd" : buildDir}
        );
        this.log.writeOut(out.toString());
        cmd = "conan build ..";
        out = child_process.execSync(
            cmd,
            {"cwd" : buildDir}
        );
        this.log.writeOut(out.toString());
    }
    public clean(projectRoot : string)  {
        let buildDir = path.join(projectRoot,"build");
        fs.mkdirSync(
            buildDir,
            { recursive: true }
        );
        PathHelper.rmFileIfExist(path.join(buildDir,"conanbuildinfo.txt"));
        PathHelper.rmFileIfExist(path.join(buildDir,"conaninfo.txt"));
        PathHelper.rmFileIfExist(path.join(buildDir,"conan.lock"));
        PathHelper.rmFileIfExist(path.join(buildDir,"graph_info.json"));
        PathHelper.rmFileIfExist(path.join(buildDir,"deploy_manifest.txt"));
        let cmakeBuildDirs =  fs.readdirSync(projectRoot, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() )
                            .filter(dirent => dirent.name.startsWith("cmake-build-"))
                            .map(dirent => dirent.name);
        cmakeBuildDirs.forEach(cmakeBuildDir => {
            PathHelper.rmDir(path.join(buildDir,cmakeBuildDir));   
        });
        let cmakeFiles =  fs.readdirSync(buildDir, { withFileTypes: true })
                            .filter(dirent => !dirent.isDirectory() )
                            .filter(dirent => dirent.name.endsWith(".cmake"))
                            .map(dirent => dirent.name);
        cmakeFiles.forEach(file => {
            PathHelper.rmFileIfExist(path.join(buildDir,file));
        });
        this.log.writeOut("Removed all cmake build directories.");
    }
    public generateDepTree(projectRoot : string) {
        let buildDir = path.join(projectRoot,"build");
        fs.mkdirSync(
            buildDir,
            { recursive: true }
        );
        PathHelper.rmFileIfExist(path.join(buildDir,"tree.html"));
        let cmd = `conan info ${path.join(projectRoot,"conanfile.py")} -g ${path.join(buildDir,"tree.html")}`;
        let out = child_process.execSync(
            cmd,
            {"cwd" : buildDir}
        );
        
    }
    public generateLaunchJson(projectRoot : string) {
        
    }
}