import { Code } from './Code';
import * as fs from 'fs';
import path = require('path');
import * as os from 'os';
import * as PathHelper from './PathHelper';
import { clangFormat } from './clang-format';

export class ConanTemplateGen {
    private conanRoot: string;
    private templateName: string;
    constructor(conanRoot: string = path.join(os.homedir(), ".conan"), templateName: string = "default") {
        this.conanRoot = conanRoot;
        this.templateName = templateName;
        if (!fs.existsSync(this.conanRoot)) {
            // ToDo : Error
        };
    }
    generateTemplateFiles(): string[] {
        let createdFiles: string[] = [];
        // ToDo : look if this strings to private
        let templatePath = path.join(
            this.conanRoot,
            "templates", "command", "new",
            this.templateName
        );
        // root level
        PathHelper.DirHelper.rmDir(templatePath);
        PathHelper.DirHelper.createDir(templatePath);
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                templatePath,
                "conanfile.py",
                Code.conanfilePy
            )
        );
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                templatePath,
                "CMakeLists.txt",
                Code.cMakeFile
            )
        );
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                templatePath,
                ".clang-format",
                clangFormat
            )
        );

        // src level
        let srcDir = path.join(templatePath, "src");
        PathHelper.DirHelper.createDir(srcDir);
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                srcDir,
                "main.cpp",
                Code.mainCpp
            )
        );
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                srcDir,
                "Greeter.hpp",
                Code.greeterHpp
            )
        );
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                srcDir,
                "Greeter.cpp",
                Code.greeterCpp
            )
        );

        //test level 
        let testDir = path.join(templatePath, "test_package");
        PathHelper.DirHelper.createDir(testDir);
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                testDir,
                "main.cpp",
                Code.testMain
            )
        );
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                testDir,
                "Greeter_test.cpp",
                Code.testGreeter
            )
        );
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                testDir,
                "conanfile.py",
                Code.testConanfile
            )
        );
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                testDir,
                "CMakeLists.txt",
                Code.testCMakeFile
            )
        );

        //vscode 
        let vscodeDir = path.join(templatePath, ".vscode");
        PathHelper.DirHelper.createDir(vscodeDir);
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                vscodeDir,
                "launch.json",
                Code.launch
            )
        );
        PathHelper.DirHelper.createDir(vscodeDir);
        createdFiles.push(
            PathHelper.FileHelper.createFile(
                vscodeDir,
                "settings.json",
                Code.settings
            )
        );
        return createdFiles;
    }
}