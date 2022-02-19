/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import {PathHelper} from './PathHelper';
import { runInThisContext } from 'vm';

export class ConanTaskProvider implements vscode.TaskProvider {
	static conanType = 'conan';
	private conanPromise: Thenable<vscode.Task[]> | undefined = undefined;

	constructor(workspaceRoot: string) {

	}

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		if (!this.conanPromise) {
			this.conanPromise = getConanTasks();
		}
		return this.conanPromise;
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const task = _task.definition.task;
		if (task) {
			const definition: ConanTaskDefinition = <any>_task.definition;
			return new vscode.Task(
                definition,
                _task.scope ?? vscode.TaskScope.Workspace, 
                definition.task, 
                'conan', 
                new vscode.ShellExecution(`echo  "${definition.task}"`)
            );
		}
		return undefined;
	}
}

function exists(file: string): Promise<boolean> {
	return new Promise<boolean>((resolve, _reject) => {
		fs.exists(file, (value) => {
			resolve(value);
		});
	});
}

function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		cp.exec(command, options, (error, stdout, stderr) => {
			if (error) {
				reject({ error, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
}

let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
	if (!_channel) {
		_channel = vscode.window.createOutputChannel('Conan');
	}
	return _channel;
}

interface ConanTaskDefinition extends vscode.TaskDefinition {
	task: string;
	file?: string;
}

const buildNames: string[] = ['build', 'compile', 'watch'];
function isBuildTask(name: string): boolean {
	for (const buildName of buildNames) {
		if (name.indexOf(buildName) !== -1) {
			return true;
		}
	}
	return true;
}

const testNames: string[] = ['test'];
function isTestTask(name: string): boolean {
	for (const testName of testNames) {
		if (name.indexOf(testName) !== -1) {
			return true;
		}
	}
	return false;
}

async function getConanTasks(): Promise<vscode.Task[]> {

	const workspaceFolders = vscode.workspace.workspaceFolders;
	const result: vscode.Task[] = [];
	
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return result;
	}
	for (const workspaceFolder of workspaceFolders) {
		const folderString = workspaceFolder.uri.fsPath;
		if (!folderString) {
			continue;
		}
		const buildDir = path.join(folderString,"build");
		PathHelper.createDir(buildDir);
		const testPkgBuild = path.join(folderString,"test_package","build");
		PathHelper.createDir(testPkgBuild);
		//
		// Installation 
		//
		let taskName = 'install debug';
		let kind: ConanTaskDefinition = {
            type: 'conan',
            task: taskName
		};
        let task = new vscode.Task(
            kind, 
            workspaceFolder, 
            taskName, 
            'Conan-Do', 
            new vscode.ShellExecution('conan install -pr:h default -pr:b default -s build_type=Debug .. --build=missing',{"cwd":buildDir})
        );
		task.group = vscode.TaskGroup.Build;
		result.push(task);
		taskName = 'install release';
		kind = {
            type: 'conan',
            task: taskName
		};
        task = new vscode.Task(
            kind, 
            workspaceFolder, 
            taskName, 
            'Conan-Do', 
            new vscode.ShellExecution('conan install -pr:h default -pr:b default -s build_type=Release .. --build=missing',{"cwd":buildDir})
        );
		//
		// Build
		//
		task.group = vscode.TaskGroup.Build;
		result.push(task);
		taskName = 'build conan';
		kind = {
            type: 'conan',
            task: taskName
		};
        task = new vscode.Task(
            kind, 
            workspaceFolder, 
            taskName, 
            'Conan-Do', 
            new vscode.ShellExecution('conan build ..',{"cwd":buildDir})
        );
		task.group = vscode.TaskGroup.Build;
		result.push(task);
		//
		// Create
		//
		task.group = vscode.TaskGroup.Build;
		result.push(task);
		taskName = 'create';
		kind = {
            type: 'conan',
            task: taskName
		};
        task = new vscode.Task(
            kind, 
            workspaceFolder, 
            taskName, 
            'Conan-Do', 
            new vscode.ShellExecution('conan create -pr:h default -pr:b default -s build_type=Debug . --build=missing',{"cwd":folderString})
        );
		task.group = vscode.TaskGroup.Build;
		result.push(task);
		taskName = 'sani';
		kind = {
            type: 'conan',
            task: taskName
		};
        task = new vscode.Task(
            kind, 
            workspaceFolder, 
            taskName, 
            'Conan-Do', 
            new vscode.ShellExecution('conan create -pr:b=default -pr:h=default -pr:h=sani -s build_type=Debug . --build=missing',{"cwd":folderString})
        );
		task.group = vscode.TaskGroup.Build;
		result.push(task);
		//
		// listener
		//
		vscode.tasks.onDidEndTask(e => {
			if ((e.execution.task.name === 'create') || (e.execution.task.name === 'sani')) {
				let buildDirs = fs.readdirSync(testPkgBuild);
				let dir = buildDirs[0];
				let testBin = path.join(testPkgBuild,dir,"bin","pkg_test");
				fs.linkSync(
					testBin,
					path.join(testPkgBuild,"pkg_test"),
				);
				if (e.execution.task.name === 'sani') {
					let bin = path.join(testPkgBuild,"pkg_test");
					let out = cp.execFileSync(bin).toString();
					let a = 1;
				}
			}
		});
	}
	return result;
}
