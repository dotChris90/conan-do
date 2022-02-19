import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as fs_extra from 'fs-extra';

import * as Conan from './ConanTemplateGen';
import { Project } from './Project';
import {ILog} from './ILog';
import {ITerminal} from './ITerminal';
import * as Doxy from './doxy_conf';

class CONFIG {
    public static buildFiles = [
        "conanbuildinfo.txt",
        "conaninfo.txt",
        "conan.lock",
        "graph_info.json",
        "deploy_manifest.txt"
    ]
}

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
            try {
                fs.rmdirSync(dirPath, { recursive: true });   
            } catch (error) {
                let a = 1;
            }
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
    private terminal : ITerminal;
    private conanRoot : string;
    private projectDir : string;
    private buildDir : string;
    private testDir : string;
    private testBuildDir : string;
    private buildFiles : string[];
    private docDir : string;
    private tree : string;
    private cppcheckBin : string;
    private srcDir : string;
    constructor(log : ILog, terminal : ITerminal, conanRoot : string, projectDir : string) {
        this.log = log;
        this.terminal = terminal;
        this.conanRoot = conanRoot;
        this.projectDir = projectDir;
        this.buildDir = path.join(projectDir,"build");
        this.testDir = path.join(projectDir,"test_package");
        this.testBuildDir = path.join(this.testDir,"build");
        this.buildFiles = [];
        CONFIG.buildFiles.forEach( file => {
            this.buildFiles.push(path.join(this.buildDir,file));
        });
        this.docDir = path.join(this.projectDir,"html");
        this.tree = path.join(this.buildDir,"tree.html");
        this.cppcheckBin = path.join(this.buildDir,"cppcheck","bin","cppcheck");
        this.srcDir = path.join(this.projectDir,"src");
    }
    private removeBuildFiles() {
        if (fs.existsSync(this.buildDir)) {
            this.buildFiles.forEach(file => {
                PathHelper.rmFileIfExist(file);
            });
        }
    }
    private removeDocFolder() {
        PathHelper.rmDir(this.docDir);
        PathHelper.rmFileIfExist(this.tree);
    }
    private removeTestBuild() {
        PathHelper.rmDir(this.testBuildDir);
    }
    private removeCMakePaths(postfixBuildDir : string = "") {
        let cmakeBuildDirs =  fs.readdirSync(this.projectDir, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() )
                            .filter(dirent => dirent.name.startsWith(`cmake-build-${postfixBuildDir}`))
                            .map(dirent => dirent.name);
        cmakeBuildDirs.forEach(cmakeBuildDir => {
            PathHelper.rmDir(path.join(this.projectDir,cmakeBuildDir));   
        });
        let cmakeFiles =  fs.readdirSync(this.buildDir, { withFileTypes: true })
                            .filter(dirent => !dirent.isDirectory() )
                            .filter(dirent => dirent.name.endsWith(".cmake"))
                            .map(dirent => dirent.name);
        cmakeFiles.forEach(file => {
            PathHelper.rmFileIfExist(path.join(this.buildDir,file));
        });
    }
    public installConan() : void {
        let cmd  = "pip3 install --upgrade conan";
        let out = child_process.execSync(
                cmd 
        );
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
    }
    public importDepdendencies() {
        fs.mkdirSync(
            this.buildDir,
            { recursive: true }
        );
        let cmd = "conan install -pr:h=default -pr:b=default -g deploy .. --build=missing";
        this.terminal.execCmd(`cd ${this.buildDir}`);
        this.terminal.execCmd(cmd);
        cmd = "conan install -pr:h=default -pr:b=default -g deploy ../test_package/ --build=missing";
        this.terminal.execCmd(cmd);
        this.terminal.execCmd(`cd ${this.projectDir}`);
        let packages =  fs.readdirSync(this.buildDir, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() )
                            .filter(dirent => !(dirent.name === "include"))
                            .map(dirent => dirent.name);
        fs.mkdirSync(
            path.join(this.buildDir,"include"),
            {recursive : true}
        );
        packages.forEach(packageIdx => {
            let includeIdx = path.join(this.buildDir,packageIdx,"include");
            PathHelper.copyIfExist(includeIdx,path.join(this.buildDir,"include"));
        });
    }
    public getProfiles() : string[] {
        let cmd = "conan profile list";
        let out = child_process.execSync(
            cmd
        );
        let profiles = out.toString().split("\n")
                            .filter(text => text !== '' )
                            .filter(text => text !== 'default');
        profiles.unshift("default");
        return profiles;
    }
    public build(buildProfile : string, hostProfile : string, type : string) {
        fs.mkdirSync(
            this.buildDir,
            { recursive: true }
        );
        PathHelper.rmFileIfExist(path.join(this.buildDir,"conanbuildinfo.txt"));
        PathHelper.rmFileIfExist(path.join(this.buildDir,"conaninfo.txt"));
        PathHelper.rmFileIfExist(path.join(this.buildDir,"conan.lock"));
        PathHelper.rmFileIfExist(path.join(this.buildDir,"graph_info.json"));
        let cmakeBuildDirs =  fs.readdirSync(this.projectDir, { withFileTypes: true })
                            .filter(dirent => dirent.isDirectory() )
                            .filter(dirent => dirent.name === `cmake-build-${type.toLowerCase()}`)
                            .map(dirent => dirent.name);
        cmakeBuildDirs.forEach(cmakeBuildDir => {
            PathHelper.rmDir(cmakeBuildDir);   
        });
        let cmd = `conan install -pr:h=${hostProfile} -pr:b=${buildProfile} -s build_type=${type} .. --build=missing`;
        this.terminal.execCmd(`cd ${this.buildDir}`);
        this.terminal.execCmd(cmd);
        cmd = "conan build ..";
        this.terminal.execCmd(cmd);
        this.terminal.execCmd(`cd ${this.projectDir}`);
        const testPkgBuild = path.join(this.projectDir,"test_package","build");
        this.terminal.execCmd(`conan create . -pr:h=${hostProfile} -pr:b=${buildProfile} -s build_type=${type} --build=missing`);
        let buildDirs = fs.readdirSync(testPkgBuild);
		let dir = buildDirs[0];
		let testBin = path.join(testPkgBuild,dir,"bin","pkg_test");
		fs.linkSync(
			testBin,
			path.join(testPkgBuild,"pkg_test"),
		);
    }
    public clean()  {
        this.removeBuildFiles();
        this.removeCMakePaths();
        this.removeDocFolder();
        this.removeTestBuild();
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
    public generateDoxygen(projectRoot : string) {
        let generator = new Conan.ConanTemplateGen(this.conanRoot,"default");
        generator.generateDoxyGen(projectRoot,this.terminal);
    }
    public analyzeCppCheck() {
        let cmd  = "";
        if (!fs.existsSync(this.cppcheckBin)) {
            cmd = `conan install -g deploy cppcheck/2.6@_/_`;
            this.terminal.execCmd(`cd ${this.buildDir}`);
            this.terminal.execCmd(cmd);
            this.terminal.execCmd(`cd ${this.projectDir}`);
        }        
        cmd = `${this.cppcheckBin} ${this.srcDir}`;
        this.terminal.execCmd(cmd);
    }
}