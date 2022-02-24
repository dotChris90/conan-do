import { ILog } from './ILog';
import * as vscode from 'vscode';

export class CodeOutputChannel implements ILog {
    private terminal: vscode.OutputChannel;
    constructor(terminal: vscode.OutputChannel) {
        this.terminal = terminal;
    }
    writeOut(text: string, withDate = false): void {
        if (withDate) {
            this.terminal.appendLine("");
            this.terminal.appendLine("\n------------------------------------------------------------------------------");
            this.terminal.appendLine(`|----------${new Date(Date.now())}---------|`);
            this.terminal.appendLine("------------------------------------------------------------------------------");
            this.terminal.appendLine("");
        }
        this.terminal.append(text);
    };
    writeErr(text: string): void {
        // ToDO : implement error
    }
}