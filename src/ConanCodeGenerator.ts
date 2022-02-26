import { Code } from './Code';
import * as fs from 'fs';
import path = require('path');
import * as os from 'os';
import { PathHelper } from './PathHelper';

export class ConanCodeGenerator {
    private conanRoot: string;
    private newTemplates: string;
    private projectRoot: string;

    constructor(conanRoot: string = path.join(os.homedir(), ".conan"), projectRoot: string = process.cwd()) {
        this.conanRoot = conanRoot;
        this.projectRoot = projectRoot;
        if (!fs.existsSync(this.conanRoot)) {
            // ToDo : Error
        };
        this.newTemplates = path.join(
            this.conanRoot,
            "templates",
            "command",
            "new"
        );
    }
    generateDoxyGen() {
        if (!fs.existsSync(path.join(this.projectRoot, "doxy.conf"))) {
            PathHelper.fileHelper.createFile(
                this.projectRoot,
                "doxy.conf",
                Code.doxygen
            );
        };
    }
    generateTemplateFiles(template: string = "default"): string[] {
        let createdFiles: string[] = [];
        let templatePath = path.join(this.newTemplates, template);
        // root level
        PathHelper.dirHelper.rmDir(templatePath);
        PathHelper.dirHelper.createDir(templatePath);
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                templatePath,
                "conanfile.py",
                Code.conanfilePy
            )
        );
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                templatePath,
                "CMakeLists.txt",
                Code.cMakeFile
            )
        );
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                templatePath,
                ".clang-format",
                Code.clangFormat
            )
        );

        // src level
        let srcDir = path.join(templatePath, "src");
        PathHelper.dirHelper.createDir(srcDir);
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                srcDir,
                "main.cpp",
                Code.mainCpp
            )
        );
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                srcDir,
                "Greeter.hpp",
                Code.greeterHpp
            )
        );
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                srcDir,
                "Greeter.cpp",
                Code.greeterCpp
            )
        );

        //test level 
        let testDir = path.join(templatePath, "test_package");
        PathHelper.dirHelper.createDir(testDir);
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                testDir,
                "main.cpp",
                Code.testMain
            )
        );
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                testDir,
                "Greeter_test.cpp",
                Code.testGreeter
            )
        );
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                testDir,
                "conanfile.py",
                Code.testConanfile
            )
        );
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                testDir,
                "CMakeLists.txt",
                Code.testCMakeFile
            )
        );

        //vscode 
        let vscodeDir = path.join(templatePath, ".vscode");
        PathHelper.dirHelper.createDir(vscodeDir);
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                vscodeDir,
                "launch.json",
                Code.launch
            )
        );
        PathHelper.dirHelper.createDir(vscodeDir);
        createdFiles.push(
            PathHelper.fileHelper.createFile(
                vscodeDir,
                "settings.json",
                Code.settings
            )
        );
        return createdFiles;
    }
}