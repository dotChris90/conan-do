// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ConanDo as Conan } from './ConanDo';
import * as os from 'os';
import * as path from 'path';
import { Project } from './Project';

export function activate(context: vscode.ExtensionContext) {
	
	console.log('Congratulations, your extension "conan-do" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	//let disposable = vscode.commands.registerCommand('conan-do.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
	//	vscode.window.showInformationMessage('Hello World from Conan Do!');
	//});
	//context.subscriptions.push(disposable);

	let disposable = vscode.commands.registerCommand('conan-do.setup', () => {
		const result = vscode.window.showInputBox({
			value: 'default',
			prompt: 'Enter name for new template or keep empty if dont want a template',
			placeHolder: 'default'
		});
		result.then(function(value) {
			Conan.installConan();
			if (value?.trim() ==="") {
				vscode.window.showInformationMessage('Conan is now present - but no template created');
			}
			else {
				Conan.createTemplate(path.join(os.homedir(),".conan"),value);
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
				Conan.createNewProject(ws, new Project(value!),"default");
			}
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.importDeps', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
			Conan.importDepdendencies(ws);
			vscode.window.showInformationMessage("Dependencies imported to build");
		}
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
