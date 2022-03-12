import { ILog } from './ILog';
import * as vscode from 'vscode';

export class CodeOutputChannel implements ILog {
    private terminal: vscode.OutputChannel;
    constructor() {
        this.terminal = vscode.window.createOutputChannel("Conan-Do");
    }
    writeOut(text: string): void {
        this.terminal.append(text);
    };
    writeErr(text: string): void {
        this.terminal.append(text);
    }
    clear(): void {
        this.terminal.clear();
        this.terminal.show();
    }
}