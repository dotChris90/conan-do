import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as fs_extra from 'fs-extra';

import * as Conan from './ConanTemplateGen';
import { Project } from './Project';
import { ILog } from './ILog';
import { ITerminal } from './ITerminal';
import { Executor } from './Executor';
import { ConanAPI } from './ConanAPI';
import * as PathHelper from './PathHelper';
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

export class ConanDo {
    private log: ILog;
    private conanAPI: ConanAPI;
    private exec: Executor;
    private conanRoot: string;
    private projectDir: string;
    private buildDir: string;
    private testDir: string;
    private testBuildDir: string;
    private includeDir: string;
    private buildFiles: string[] = [];
    private docDir: string;
    private tree: string;
    private cppcheckBin: string;
    private srcDir: string;
    private doxyBin: string;
    constructor(log: ILog, conanRoot: string, projectDir: string) {
        this.log = log;
        this.conanAPI = new ConanAPI(this.log);
        this.conanRoot = conanRoot;
        this.projectDir = projectDir;
        this.srcDir = path.join(this.projectDir, "src");
        this.buildDir = path.join(projectDir, "build");
        this.testDir = path.join(projectDir, "test_package");
        this.testBuildDir = path.join(this.testDir, "build");
        this.includeDir = path.join(this.buildDir, "include");
        this.docDir = path.join(this.projectDir, "html");
        this.tree = path.join(this.buildDir, "tree.html");
        this.doxyBin = path.join(this.buildDir, "doxygen", "bin", "doxygen")
        CONFIG.buildFiles.forEach(file => {
            this.buildFiles.push(path.join(this.buildDir, file));
        });
        this.cppcheckBin = path.join(this.buildDir, "cppcheck", "bin", "cppcheck");
        this.exec = new Executor(this.log);
    }
    private removeBuildFiles() {
        if (fs.existsSync(this.buildDir)) {
            this.buildFiles.forEach(file => {
                PathHelper.FileHelper.rmIfExist(file);
            });
        }
    }
    private removeDocs() {
        PathHelper.DirHelper.rmDir(this.docDir);
        PathHelper.FileHelper.rmIfExist(this.tree);
    }
    private removeTestBuild() {
        PathHelper.DirHelper.rmDir(this.testBuildDir);
    }
    private removeCMakePaths(postfixBuildDir: string = "") {
        let cmakeBuildDirs = fs.readdirSync(this.projectDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => dirent.name.startsWith(`cmake-build-${postfixBuildDir}`))
            .map(dirent => dirent.name);
        cmakeBuildDirs.forEach(cmakeBuildDir => {
            PathHelper.DirHelper.rmDir(path.join(this.projectDir, cmakeBuildDir));
        });
        let cmakeFiles = fs.readdirSync(this.buildDir, { withFileTypes: true })
            .filter(dirent => !dirent.isDirectory())
            .filter(dirent => dirent.name.endsWith(".cmake"))
            .map(dirent => dirent.name);
        cmakeFiles.forEach(file => {
            PathHelper.FileHelper.rmIfExist(path.join(this.buildDir, file));
        });
    }
    public installConan() {
        let cmd = "pip3";
        let args = [
            "install",
            "--upgrade",
            "conan"
        ];
        return this.exec.execPromise(cmd, args);
    }
    public createTemplate(templateName: string = "default"): void {
        let generator = new Conan.ConanTemplateGen(this.conanRoot, templateName);
        let templateFiles = generator.generateTemplateFiles();
    }
    public createNewProject(dirPath: string, project: Project, templateName: string) {
        return this.conanAPI.new(project.getFullName(), templateName, dirPath);
    }
    public importDepdendencies() {
        PathHelper.DirHelper.createDir(this.buildDir);
        this.conanAPI.install(
            "default",
            "default",
            "Release",
            this.buildDir,
            "..",
            true
        );
        let importPromise = this.conanAPI.install(
            "default",
            "default",
            "Release",
            this.buildDir,
            path.join("..", "test_package"),
            true
        );
        let packages = fs.readdirSync(this.buildDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => !(dirent.name === "include"))
            .map(dirent => dirent.name);
        PathHelper.DirHelper.createDir(this.includeDir);
        packages.forEach(packageIdx => {
            let includeIdx = path.join(this.buildDir, packageIdx, "include");
            PathHelper.FileHelper.copyIfExist(includeIdx, path.join(this.buildDir, "include"));
        });
        return importPromise;
    }
    public getProfiles(): string[] {
        return this.conanAPI.profile();
    }
    public build(buildProfile: string, hostProfile: string, type: string) {
        this.clean();
        this.conanAPI.install(
            buildProfile,
            hostProfile,
            type,
            this.buildDir,
            "..",
            false
        ).then(() => {
            this.conanAPI.build("..", this.buildDir).then(() => {
                fs.readdirSync(this.testBuildDir).forEach((folder => {
                    PathHelper.DirHelper.rmDir(path.join(this.testBuildDir, folder));
                }));
                this.conanAPI.create(
                    buildProfile,
                    hostProfile,
                    type,
                    this.buildDir,
                    ".."
                ).then(() => {
                    let testBin = path.join(
                        this.testBuildDir,
                        fs.readdirSync(this.testBuildDir)[0],
                        "bin",
                        "pkg_test"
                    );
                    fs.linkSync(
                        testBin,
                        path.join(this.testBuildDir, "pkg_test")
                    );
                });
            });
        });
    }
    public clean() {
        this.removeBuildFiles();
        this.removeCMakePaths();
        this.removeDocs();
        this.removeTestBuild();
    }
    public generateDepTree(projectRoot: string) {
        PathHelper.DirHelper.createDir(this.buildDir);
        PathHelper.FileHelper.rmIfExist(path.join(this.buildDir, "tree.html"));
        return this.conanAPI.info(
            this.projectDir,
            this.tree
        );
    }
    public generateDoxygen(projectRoot: string) {
        if (!fs.existsSync(path.join(projectRoot, "doxy.conf"))) {
            PathHelper.FileHelper.createFile(
                projectRoot,
                "doxy.conf",
                Doxy.doxygen
            );
        };
        PathHelper.DirHelper.rmDir(path.join(projectRoot, "html"));
        let cmd = this.doxyBin;
        let args = [
            path.join(projectRoot, "doxy.conf")
        ];
        let doxyPromise: Promise<unknown>;
        if (!fs.existsSync(this.doxyBin)) {
            //let doxyPromise: any;
            if (!fs.existsSync(path.join(projectRoot, "build"))) {
                PathHelper.DirHelper.createDir(this.buildDir);
                this.conanAPI.install(
                    "default",
                    "default",
                    "Release",
                    this.buildDir,
                    "doxygen/1.9.2@_/_",
                    true
                ).then(() => {
                    doxyPromise = this.exec.execPromise(cmd, args);
                });
            }
        }
        else {
            doxyPromise = this.exec.execPromise(cmd, args);
        }
        return doxyPromise!;
    }
    public analyzeCppCheck() {
        if (!fs.existsSync(this.cppcheckBin)) {
            this.conanAPI.install(
                "default",
                "default",
                "Release",
                this.buildDir,
                "cppcheck/2.6@_/_",
                true
            );
        }
        return this.exec.execPromise(this.cppcheckBin, [this.srcDir]);
    }
}