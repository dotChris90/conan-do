import { ILog } from './ILog';
import { Executor } from './Executor';
import { execSync } from 'child_process';

export class ConanAPI {
    private exec: Executor;
    constructor(log: ILog) {
        this.exec = new Executor(log);
    }
    public new(
        project: string,
        templateName: string,
        workDir: string) {
        let cmd = "conan";
        let args = [
            "new",
            project,
            "-m",
            templateName
        ];
        return this.exec.execPromise(cmd, args, workDir);
    }
    public profile() {
        let cmd = "conan profile list";
        let out = execSync(
            cmd
        );
        let profiles = out.toString().split("\n")
            .filter(text => text !== '')
            .filter(text => text !== 'default');
        profiles.unshift("default");
        return profiles;
    }
    public info(conanfile: string, generatorDst: string) {
        let cmd = "conan";
        let args = [
            "info",
            conanfile,
            "-g",
            generatorDst
        ];
        return this.exec.execPromise(cmd, args);
    }
    public install(
        buildProfile: string,
        hostProfile: string,
        buildType: string,
        workDir: string,
        conanfile: string = "..",
        deploy: boolean = false
    ) {
        let cmd = "conan";
        let args = [
            "install",
            `-pr:h=${hostProfile}`,
            `-pr:b=${buildProfile}`,
            `-s build_type=${buildType}`,
            conanfile,
            '--build=missing'
        ];
        if (deploy) {
            args.push("-g deploy");
        }
        return this.exec.execPromise(cmd, args, workDir);
    }
    public build(conanfile: string = "..", workDir: string) {
        let cmd = "conan";
        let args = [
            "build",
            conanfile
        ];
        return this.exec.execPromise(cmd, args, workDir);
    }
    public create(
        buildProfile: string,
        hostProfile: string,
        buildType: string,
        workDir: string,
        conanfile: string = "..",
    ) {
        let cmd = "conan";
        let args = [
            "create",
            `-pr:h=${hostProfile}`,
            `-pr:b=${buildProfile}`,
            `-s build_type=${buildType}`,
            conanfile,
            '--build=missing'
        ];
        return this.exec.execPromise(cmd, args, workDir);
    }
}