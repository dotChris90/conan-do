// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';

import { Project } from './Project';
import { ConanDo } from './ConanDo';
import { CodeOutputChannel } from './CodeOutputChannel';
import { ConanTaskProvider } from './ConanTaskProvider';
import { VSCodeTerminal } from './VSCodeTerminal';
import { Executor } from './Executor';
import { ConanAPI } from './ConanAPI';

let conanTaskProvider: vscode.Disposable | undefined;

let conanOut: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	// env
	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (!workspaceRoot) {
		return;
	}
	let conanRoot = path.join(os.homedir(), ".conan");
	conanOut = vscode.window.createOutputChannel("Conan-Do");
	conanTaskProvider = vscode.tasks.registerTaskProvider(
		ConanTaskProvider.conanType,
		new ConanTaskProvider(workspaceRoot)
	);

	let conanTerm = vscode.window.createTerminal({ name: 'Conan-Do' });
	let conanDo = new ConanDo(
		new CodeOutputChannel(conanOut),
		conanRoot,
		workspaceRoot
	);
	let disposable = vscode.commands.registerCommand('conan-do.setup', () => {
		vscode.window.showInputBox({
			value: 'default',
			prompt: 'Enter name for new template or keep empty if dont want a template',
			placeHolder: 'default'
		}).then(value => {
			conanDo.installConan().then(() => {
				if (value?.trim() === "") {
					vscode.window.showInformationMessage('Conan is now present - but no template created');
				}
				else {
					conanDo.createTemplate(value);
					vscode.window.showInformationMessage(`Conan is now present - added new template ${value}`);
				}
			});
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.new', () => {
		vscode.window.showInputBox({
			value: 'default/0.1.0',
			prompt: 'Enter name/version for package',
			placeHolder: 'default/0.1.0'
		}).then(value => {
			conanDo.createNewProject(workspaceRoot, new Project(value!), "default").then(() => {
				vscode.window.showInformationMessage('new project created');
			});
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.importDeps', () => {
		conanDo.importDepdendencies();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.buildRelease', () => {
		let profiles = conanDo.getProfiles();
		vscode.window.showQuickPick(profiles, {
			placeHolder: 'choose : your profile e.g. default'
		}).then((value) => {
			conanDo.build('default', value!, 'Release');
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.buildDebug', () => {
		let profiles = conanDo.getProfiles();
		vscode.window.showQuickPick(profiles, {
			placeHolder: 'choose : your profile e.g. default'
		}).then((value) => {
			conanDo.build('default', value!, 'Debug');
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.clean', () => {
		conanDo.clean();
		vscode.window.showInformationMessage("Cleaning finish.");
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.genDepTree', () => {
		conanDo.generateDepTree(workspaceRoot).then(() => {
			let treePath = vscode.Uri.file(path.join(workspaceRoot, "build", "tree.html"));
			vscode.workspace.openTextDocument(treePath).then(textDoc => {
				vscode.window.showTextDocument(textDoc, 1, true).then(textEditor => {
					if (vscode.window.visibleTextEditors.length === 1) {
						vscode.commands.executeCommand("extension.preview");
						vscode.window.showInformationMessage("Show Dependency Tree.");
					}
					else {
						vscode.window.showInformationMessage("Generated Dependency Tree.");
					}
				});
			});
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.genDoxy', () => {
		conanDo.generateDoxygen(workspaceRoot)!.then(() => {
			let doc = path.join(workspaceRoot, "html", "index.html");
			vscode.workspace.openTextDocument(doc).then(textDoc => {
				vscode.window.showTextDocument(textDoc, 1, true).then(textEditor => {
					if (vscode.window.visibleTextEditors.length === 1) {
						vscode.commands.executeCommand("extension.preview");
						vscode.window.showInformationMessage("Show Doxy Documentation.");
					}
					else {
						vscode.window.showInformationMessage("Generated Doxy Documentation.");
					}
				});
			});
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('conan-do.cppcheck', () => {
		conanDo.analyzeCppCheck();
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (conanTaskProvider) {
		conanTaskProvider.dispose();
	}
}
