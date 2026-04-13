import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const defaultExcludes = new Set(['node_modules', '.git', 'dist', 'out', '__pycache__', '.next', 'build', 'temp', 'target']);
    const FileTreeProvider = new LLMFileTreeProvider(defaultExcludes);

    const treeView = vscode.window.createTreeView('llmFileTreeView', {
        treeDataProvider: FileTreeProvider,
        canSelectMany: true,
        showCollapseAll: true
    });

    context.subscriptions.push(treeView);

    context.subscriptions.push(vscode.commands.registerCommand('llmFileTree.refresh', () => {
        FileTreeProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('llmFileTree.exclude', (item: FileItem, selectedItems: FileItem[]) => {
        const itemsToProcess = selectedItems?.length > 1 ? selectedItems : [item];
        for (const i of itemsToProcess) {
            FileTreeProvider.exclude(i.resourceUri.fsPath);
            FileTreeProvider.updateItem(i);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('llmFileTree.include', (item: FileItem, selectedItems: FileItem[]) => {
        const itemsToProcess = selectedItems?.length > 1 ? selectedItems : [item];
        for (const i of itemsToProcess) {
            FileTreeProvider.include(i.resourceUri.fsPath);
            FileTreeProvider.updateItem(i);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('llmFileTree.copy', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;
        
        const rootPath = workspaceFolders[0].uri.fsPath;
        const treeString = FileTreeProvider.generateStringTree(rootPath, '');
        await vscode.env.clipboard.writeText(path.basename(rootPath) + '\n' + treeString);
        vscode.window.showInformationMessage('Workspace Tree copied to clipboard!');
    }));
}

export class FileItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly isDirectory: boolean,
        public isIgnored: boolean,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly childCountDescriptor?: string
    ) {
        super(resourceUri, collapsibleState);
        this.contextValue = isIgnored ? 'excluded' : 'included';
        this.iconPath = isIgnored ? new vscode.ThemeIcon('eye-closed') : (isDirectory ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File);
        
        let desc = '';
        if (isIgnored) desc += 'ignoring ';
        if (childCountDescriptor) desc += childCountDescriptor;
        
        this.description = desc.trim();
    }
}

class LLMFileTreeProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | void> = new vscode.EventEmitter<FileItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | void> = this._onDidChangeTreeData.event;

    private manuallyExcluded = new Set<string>();
    private manuallyIncluded = new Set<string>();

    constructor(private defaultExcludeNames: Set<string>) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateItem(element: FileItem): void {
        this._onDidChangeTreeData.fire(element);
        // We also fire for undefined so parent refreshing shows correct status
        this._onDidChangeTreeData.fire();
    }

    exclude(fsPath: string) {
        this.manuallyExcluded.add(fsPath);
        this.manuallyIncluded.delete(fsPath);
    }

    include(fsPath: string) {
        this.manuallyIncluded.add(fsPath);
        this.manuallyExcluded.delete(fsPath);
    }

    private isExcluded(fsPath: string, name: string): boolean {
        if (this.manuallyIncluded.has(fsPath)) return false;
        if (this.manuallyExcluded.has(fsPath)) return true;
        return this.defaultExcludeNames.has(name);
    }

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileItem): Thenable<FileItem[]> {
        if (!vscode.workspace.workspaceFolders) {
            return Promise.resolve([]);
        }

        const dirPath = element ? element.resourceUri.fsPath : vscode.workspace.workspaceFolders[0].uri.fsPath;
        
        let files: string[] = [];
        try {
            files = fs.readdirSync(dirPath);
        } catch (e) {
            return Promise.resolve([]);
        }

        files.sort((a, b) => {
            const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
            const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

        const items = files.map(file => {
            const fullPath = path.join(dirPath, file);
            let isDir = false;
            try { isDir = fs.statSync(fullPath).isDirectory(); } catch (e) { }

            const excluded = this.isExcluded(fullPath, file);
            const state = isDir ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
            
            let childDesc: string | undefined;
            if (isDir) {
                let validCount = 0;
                let hasSubDirs = false;
                try {
                    const subFiles = fs.readdirSync(fullPath);
                    for (const sf of subFiles) {
                        const sfPath = path.join(fullPath, sf);
                        if (!this.isExcluded(sfPath, sf)) {
                            validCount++;
                            if (!hasSubDirs) {
                                try {
                                    if (fs.statSync(sfPath).isDirectory()) {
                                        hasSubDirs = true;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                } catch (e) {}
                childDesc = `(${validCount}${hasSubDirs ? '..' : ''})`;
            }

            return new FileItem(vscode.Uri.file(fullPath), isDir, excluded, state, childDesc);
        });

        return Promise.resolve(items);
    }

    generateStringTree(dirPath: string, prefix: string): string {
        let result = '';
        let files: string[] = [];
        
        try { files = fs.readdirSync(dirPath); } catch (e) { return ''; }

        // Sort: directories first
        files.sort((a, b) => {
            let aIsDir = false, bIsDir = false;
            try { aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory(); } catch (e) {}
            try { bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory(); } catch (e) {}
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fullPath = path.join(dirPath, file);
            const isLast = i === files.length - 1;
            
            let isDirectory = false;
            try { isDirectory = fs.statSync(fullPath).isDirectory(); } catch (e) { continue; }

            const excluded = this.isExcluded(fullPath, file);
            const connector = isLast ? '└── ' : '├── ';

            if (excluded) {
                result += `${prefix}${connector}${file}\n`;
            } else {
                result += `${prefix}${connector}${file}\n`;
                if (isDirectory) {
                    const newPrefix = prefix + (isLast ? '    ' : '│   ');
                    result += this.generateStringTree(fullPath, newPrefix);
                }
            }
        }

        return result;
    }
}
