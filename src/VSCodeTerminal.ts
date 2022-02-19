import {ITerminal} from './ITerminal';
import * as vscode from 'vscode';

export class VSCodeTerminal implements ITerminal {
    private terminal : vscode.Terminal;
    constructor(terminal : vscode.Terminal) {
        this.terminal = terminal;
    }
    execCmd(cmd: string,): void {
        this.terminal.sendText(cmd);
    }
}