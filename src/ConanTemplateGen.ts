import * as Code from './Code';
import * as fs from 'fs';
import * as Path from 'path';
import path = require('path');
import * as os from 'os';


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

        return createdFiles;
    }
}