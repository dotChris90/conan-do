import {ILog} from './ILog';
import * as vscode from 'vscode';

export class VSCodeTerminal implements ILog {
    private terminal : vscode.Terminal;
    constructor(terminal : vscode.Terminal) {
        this.terminal = terminal;
    }
    writeOut(text: string): boolean {
        
        return true;
    };
}