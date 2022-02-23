import { ILog } from './ILog';
import * as vscode from 'vscode';

export class CodeOutputChannel implements ILog {
    private terminal: vscode.OutputChannel;
    constructor(terminal: vscode.OutputChannel) {
        this.terminal = terminal;
    }
    writeOut(text: string): boolean {
        this.terminal.show();
        this.terminal.append(text);
        return true;
    };
    writeErr(text: string): void {
        // ToDO : implement error
    }
}