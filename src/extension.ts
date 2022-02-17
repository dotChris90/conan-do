// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

import { Project } from './Project';
import { ConanDo } from './ConanDo';
import {VSCodeTerminal } from './VSCodeTerminal';
import * as fs from 'fs';
import { execSync } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	
	let conanOut = vscode.window.createOutputChannel("Conan-Do");
	let conanRoot  = path.join(os.homedir(),".conan");
	let conanDo = new ConanDo(
		new VSCodeTerminal(
			conanOut
		),
		conanRoot
	);

	let disposable = vscode.commands.registerCommand('conan-do.setup', () => {
		const result = vscode.window.showInputBox({
			value: 'default',
			prompt: 'Enter name for new template or keep empty if dont want a template',
			placeHolder: 'default'
		});
		result.then(function(value) {
			conanOut.show();
			conanDo.installConan();
			if (value?.trim() ==="") {
				vscode.window.showInformationMessage('Conan is now present - but no template created');
			}
			else {
				conanDo.createTemplate(value);
				vscode.window.showInformationMessage(`Conan is now present - added new template ${value}`);
			}
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.new', () => {
		const result = vscode.window.showInputBox({
			value: 'default/0.1.0',
			prompt: 'Enter name/version for package',
			placeHolder: 'default/0.1.0'
		});
		result.then(function(value) {
			if(vscode.workspace.workspaceFolders !== undefined) {
				let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
				conanOut.show();
				conanDo.createNewProject(ws, new Project(value!),"default");
			}
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.importDeps', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
			conanOut.show();
			conanDo.importDepdendencies(ws);
			vscode.window.showInformationMessage("Dependencies imported to build");
		}
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.buildRelease', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
			let profiles = conanDo.getProfiles();
			const result =  vscode.window.showQuickPick(profiles, {
				placeHolder: 'choose : your profile e.g. default'
			});
			result.then(function(value) {
				conanOut.show();
				conanDo.buildRelease(ws,value!,'default');
			});
			vscode.window.showInformationMessage("Finish build Release - check output Tab in VS Code");
		}
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.clean', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
			conanOut.show();
			conanDo.clean(ws);
			vscode.window.showInformationMessage("Cleaning finish.");
		}
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.genDepTree', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
			conanOut.show();
			conanDo.generateDepTree(ws);
			//let treeUri = vscode.Uri.file("file:///home/kac2st/experimental/itk/privat/build/tree.html");
			//vscode.commands.executeCommand("extension.preview",["/home/kac2st/experimental/itk/privat/build/tree.html"]);
			vscode.window.showInformationMessage("Check Dependency Tree.");
			//let out = execSync(
			//	cmd,
			//	{"cwd" : buildDir}
			//);
		}
	});
	context.subscriptions.push(disposable);

}

// this method is called when your extension is deactivated
export function deactivate() {}
