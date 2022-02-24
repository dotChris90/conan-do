import { spawn } from 'child_process';
import { ILog } from './ILog';
import * as os from 'os';

export class Executor {
  private log: ILog;
  constructor(log: ILog) {
    this.log = log;
  }
  public execPromise(command: string, args: string[], workingDir: string = "", options: any = {}, withDate = false) {
    workingDir = workingDir === "" ? process.cwd() : workingDir;
    return new Promise((resolve, reject) => {
      options['cwd'] = workingDir;
      options['shell'] = true;
      const commandProc = spawn(command, args, options);
      commandProc.stdout.on("data", (data) => {
        this.log.writeOut(data.toString(), withDate);
      });
      commandProc.stderr.on("data", (data) => {
        this.log.writeErr(data.toString());
      });
      commandProc.on('exit', function (code) {
        // *** Process completed
        resolve(code);
      });
      commandProc.on('error', function (err) {
        // *** Process creation failed
        reject(err);
      });
    });
  }
}