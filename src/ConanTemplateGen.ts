import * as Code from './Code';
import * as fs from 'fs';
import * as Path from 'path';
import path = require('path');
import * as os from 'os';
import { execSync } from 'child_process';
import * as Doxy from './doxy_conf';
import * as vscode from 'vscode';
import { ITerminal } from './ITerminal';
import { clangFormat } from './clang-format';


class PathCreation {
    public static createDir(dirPath : string ) {
        fs.mkdirSync(
            dirPath,
            { recursive: true }
        );
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

export class ConanTemplateGen {
    private conanRoot : string;
    private templateName : string;
    constructor(conanRoot : string = path.join(os.homedir(),".conan"), templateName : string = "default") {
        this.conanRoot = conanRoot;
        this.templateName = templateName;
        if (!fs.existsSync(this.conanRoot)) {
                // ToDo : Error
        };
    }
    generateTemplateFiles() : string[] {
        let createdFiles : string[] = [];
        // ToDo : look if this strings to private
        let templatePath = path.join(
            this.conanRoot,
            "templates","command","new",
            this.templateName
        );
        // root level
        PathCreation.rmDir(templatePath);
        PathCreation.createDir(templatePath);
        createdFiles.push(
            PathCreation.createFile(
                templatePath,
                "conanfile.py",
                Code.conanfile_py
            )
        );
        createdFiles.push(
            PathCreation.createFile(
                templatePath,
                "CMakeLists.txt",
                Code.CMakeFile            
            )
        );
        createdFiles.push(
            PathCreation.createFile(
                templatePath,
                ".clang-format",
                clangFormat           
            )
        );

        // src level
        let srcDir = path.join(templatePath,"src");
        PathCreation.createDir(srcDir);
        createdFiles.push(
            PathCreation.createFile(
                srcDir,
                "main.cpp",
                Code.main_cpp            
            )
        );
        createdFiles.push(
            PathCreation.createFile(
                srcDir,
                "Greeter.hpp",
                Code.Greeter_hpp            
            )
        );
        createdFiles.push(
            PathCreation.createFile(
                srcDir,
                "Greeter.cpp",
                Code.Greeter_cpp            
            )
        );
        
        //test level 
        let testDir = path.join(templatePath,"test_package");
        PathCreation.createDir(testDir);
        createdFiles.push(
            PathCreation.createFile(
                testDir,
                "main.cpp",
                Code.test_main            
            )
        );
        createdFiles.push(
            PathCreation.createFile(
                testDir,
                "Greeter_test.cpp",
                Code.test_Greeter            
            )
        );
        createdFiles.push(
            PathCreation.createFile(
                testDir,
                "conanfile.py",
                Code.test_Conanfile            
            )
        );
        createdFiles.push(
            PathCreation.createFile(
                testDir,
                "CMakeLists.txt",
                Code.test_CMakeFile            
            )
        );

        //vscode 
        let vscodeDir = path.join(templatePath,".vscode");
        PathCreation.createDir(vscodeDir);
        createdFiles.push(
            PathCreation.createFile(
                vscodeDir,
                "launch.json",
                Code.launch            
            )
        );
        PathCreation.createDir(vscodeDir);
        createdFiles.push(
            PathCreation.createFile(
                vscodeDir,
                "settings.json",
                Code.settings            
            )
        );
        // profiles
        let profilePath = path.join(this.conanRoot,"profiles");
        createdFiles.push(
            PathCreation.createFile(
                profilePath,
                "sani",
                Code.saniProfi
            )
        );
        return createdFiles;
    }

    public generateDoxyGen(projectRoot : string, terminal : ITerminal) {
        if (!fs.existsSync(path.join(projectRoot,"doxy.conf"))) {
            PathCreation.createFile(
                    projectRoot,
                    "doxy.conf",
                    Doxy.doxygen            
            );
        };
        PathCreation.rmDir(path.join(projectRoot,"html"));
        if (!fs.existsSync(path.join(projectRoot,"build","doxygen","bin","doxygen"))) {
            if (!fs.existsSync(path.join(projectRoot,"build"))) {
                PathCreation.createDir(path.join(projectRoot,"build"));
            }
            execSync(
                "conan install -g deploy doxygen/1.9.2@_/_",
                {"cwd" : path.join(projectRoot,"build")}
            );
        }
        let cmd =  `${path.join(projectRoot,"build","doxygen","bin","doxygen")} ${path.join(projectRoot,"doxy.conf")}`;
        terminal.execCmd(cmd);
    }
}