import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import { ConanCodeGenerator } from './ConanCodeGenerator';
import { Project } from './Project';
import { ILog } from './ILog';
import { Executor } from './Executor';
import { ConanAPI } from './ConanAPI';
import { PathHelper } from './PathHelper';

class CONFIG {
    public static buildFiles = [
        "conanbuildinfo.txt",
        "conaninfo.txt",
        "conan.lock",
        "graph_info.json",
        "deploy_manifest.txt"
    ];
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
    private cppcheckHtml: string;
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
        this.doxyBin = path.join(this.buildDir, "doxygen", "bin", "doxygen");
        CONFIG.buildFiles.forEach(file => {
            this.buildFiles.push(path.join(this.buildDir, file));
        });
        this.cppcheckBin = path.join(this.buildDir, "cppcheck", "bin", "cppcheck");
        this.cppcheckHtml = path.join(this.buildDir, "cppcheck", "bin", "cppcheck-htmlreport");
        this.exec = new Executor(this.log);
    }
    private getImportedPackagePaths() {
        return fs.readdirSync(this.buildDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => !(dirent.name === "include"))
            .map(dirent => dirent.name);
    }
    private removeBuildFiles() {
        if (fs.existsSync(this.buildDir)) {
            this.buildFiles.forEach(file => {
                PathHelper.fileHelper.rmIfExist(file);
            });
        }
    }
    private removeDocs() {
        PathHelper.dirHelper.rmDir(this.docDir);
        PathHelper.fileHelper.rmIfExist(this.tree);
    }
    private removeTestBuild() {
        PathHelper.dirHelper.rmDir(this.testBuildDir);
    }
    private removeCMakePaths(postfixBuildDir: string = "") {
        let cmakeBuildDirs = fs.readdirSync(this.projectDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => dirent.name.startsWith(`cmake-build-${postfixBuildDir}`))
            .map(dirent => dirent.name);
        cmakeBuildDirs.forEach(cmakeBuildDir => {
            PathHelper.dirHelper.rmDir(path.join(this.projectDir, cmakeBuildDir));
        });
        let cmakeFiles = fs.readdirSync(this.buildDir, { withFileTypes: true })
            .filter(dirent => !dirent.isDirectory())
            .filter(dirent => dirent.name.endsWith(".cmake"))
            .map(dirent => dirent.name);
        cmakeFiles.forEach(file => {
            PathHelper.fileHelper.rmIfExist(path.join(this.buildDir, file));
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
        let generator = new ConanCodeGenerator(this.conanRoot);
        let templateFiles = generator.generateTemplateFiles(templateName);
    }
    public createNewProject(dirPath: string, project: Project, templateName: string) {
        return this.conanAPI.new(project.getFullName(), templateName, dirPath);
    }
    public importDepdendencies() {
        PathHelper.dirHelper.createDir(this.buildDir);
        this.conanAPI.install(
            "default",
            "default",
            "Release",
            this.buildDir,
            "..",
            true
        ).then(() => {
            this.conanAPI.install(
                "default",
                "default",
                "Release",
                this.buildDir,
                path.join("..", "test_package"),
                true
            ).then(() => {
                let packages = this.getImportedPackagePaths();
                PathHelper.dirHelper.createDir(this.includeDir);
                packages.forEach(packageIdx => {
                    let includeIdx = path.join(this.buildDir, packageIdx, "include");
                    PathHelper.fileHelper.copyIfExist(includeIdx, path.join(this.buildDir, "include"));
                });
            });
        });
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
                PathHelper.dirHelper.createDir(this.testBuildDir);
                fs.readdirSync(this.testBuildDir).forEach((folder => {
                    PathHelper.dirHelper.rmDir(path.join(this.testBuildDir, folder));
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
        PathHelper.dirHelper.createDir(this.buildDir);
        PathHelper.fileHelper.rmIfExist(path.join(this.buildDir, "tree.html"));
        return this.conanAPI.info(
            this.projectDir,
            this.tree
        );
    }
    public generateDoxygen() {
        let generator = new ConanCodeGenerator(this.conanRoot, this.projectDir);
        generator.generateDoxyGen();
        PathHelper.dirHelper.rmDir(path.join(this.projectDir, "html"));
        let cmd = this.doxyBin;
        let args = [
            path.join(this.projectDir, "doxy.conf")
        ];
        if (!fs.existsSync(this.doxyBin)) {
            PathHelper.dirHelper.createDir(this.buildDir);
            this.conanAPI.install(
                "default",
                "default",
                "Release",
                this.buildDir,
                "doxygen/1.9.2@_/_",
                true
            ).then(() => {
                return this.exec.execPromise(cmd, args, this.projectDir, {}, true);
            });
        }
        else {
            return this.exec.execPromise(cmd, args, this.projectDir, {}, true);
        }
    }
    private executeCppCheck() {
        let args = [
            "--enable=all",
            "--xml",
            "--xml-version=2",
            "--output-file=cppcheck.xml",
            this.srcDir
        ];
        this.exec.execPromise(this.cppcheckBin, args, path.join(this.projectDir, "cppcheck")).then(() => {
            args = ["--source-dir=..",
                "--file=cppcheck.xml",
                "--report-dir=."
            ];
            this.exec.execPromise(this.cppcheckHtml, args, path.join(this.projectDir, "cppcheck"));
        });
    }
    public analyzeCppCheck() {
        PathHelper.dirHelper.createDir(path.join(this.projectDir, "cppcheck"));
        if (!fs.existsSync(this.cppcheckBin)) {
            this.conanAPI.install(
                "default",
                "default",
                "Release",
                this.buildDir,
                "cppcheck/2.6@_/_",
                true
            ).then(() => {
                this.executeCppCheck();
            });
        }
        this.executeCppCheck();
    }
    public deploy() {
        PathHelper.dirHelper.createDir(this.buildDir);
        this.conanAPI.install(
            "default",
            "default",
            "Release",
            this.buildDir,
            "..",
            true
        ).then(() => {
            this.conanAPI.install(
                "default",
                "default",
                "Release",
                this.buildDir,
                path.join("..", "test_package"),
                true
            ).then(() => {
                PathHelper.dirHelper.createDir(path.join(this.projectDir, "deploy"));
                let foldersInPkgs: string[] = [];
                let packages = this.getImportedPackagePaths();
                packages.forEach(pkg => {
                    let foldersInPkg = fs.readdirSync(path.join(this.buildDir, pkg), { withFileTypes: true })
                        .filter(dir => dir.isDirectory())
                        .map(dir => dir.name);
                    foldersInPkgs = foldersInPkgs.concat(foldersInPkg);
                });
                let foldersInPkgsSet = new Set(foldersInPkgs);
                foldersInPkgsSet.forEach(folder => {
                    PathHelper.dirHelper.createDir(path.join(this.projectDir, "deploy", folder));
                    packages.forEach(pkg => {
                        PathHelper.fileHelper.copyIfExist(
                            path.join(this.buildDir, pkg, folder),
                            path.join(this.projectDir, "deploy", folder)
                        );
                    });
                });
            });
        });
    }
}