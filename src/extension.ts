// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

import { Project } from './Project';
import { ConanDo } from './ConanDo';
import {VSCodeTerminal } from './VSCodeTerminal';
import {ConanTaskProvider} from './ConanTaskProvider';

let conanTaskProvider: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
	
	let conanOut	= vscode.window.createTerminal("Conan-Do");
	let coOut 		= vscode.window.createOutputChannel("conan-Do"); 
	
	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (!workspaceRoot) {
		return;
	}
		
	conanTaskProvider = vscode.tasks.registerTaskProvider(
		ConanTaskProvider.conanType, 
		new ConanTaskProvider(workspaceRoot)
	);
	
	let conanRoot  = path.join(os.homedir(),".conan");
	let project = vscode.workspace.workspaceFolders![0].uri.fsPath;
	let conanDo = new ConanDo(
		new VSCodeTerminal(
			conanOut
		),
		conanRoot,
		project
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
			conanDo.importDepdendencies();
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
				conanDo.buildRelease(value!,'default');
			});
			vscode.window.showInformationMessage("Finish build Release - check output Tab in VS Code");
		}
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.clean', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			conanDo.clean();
			vscode.window.showInformationMessage("Cleaning finish.");
		}
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.genDepTree', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
			conanDo.generateDepTree(ws);
			let treePath = vscode.Uri.file(path.join(ws,"build","tree.html"));
			vscode.workspace.openTextDocument(treePath).then(
				textDoc => {
					vscode.window.showTextDocument(textDoc,1,true).then(
						textEditor => {
							if (vscode.window.visibleTextEditors.length === 1) {
								vscode.commands.executeCommand("extension.preview");
								vscode.window.showInformationMessage("Show Dependency Tree.");
							}
							else {
								vscode.window.showInformationMessage("Generated Dependency Tree.");
							}
							
						}
					);
				}
			);
		}
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.genDoxy', () => {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
			conanOut.show();
			conanDo.generateDoxygen(ws);
			let doc = path.join(ws,"html","index.html");
			vscode.workspace.openTextDocument(doc).then(
				textDoc => {
					vscode.window.showTextDocument(textDoc,1,true).then(
						textEditor => {
							if (vscode.window.visibleTextEditors.length === 1) {
								vscode.commands.executeCommand("extension.preview");
								vscode.window.showInformationMessage("Show Doxy Documentation.");
							}
							else {
								vscode.window.showInformationMessage("Generated Doxy Documentation.");
							}
							
						}
					);
				}
			);
		}
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (conanTaskProvider) {
		conanTaskProvider.dispose();
	}
}
