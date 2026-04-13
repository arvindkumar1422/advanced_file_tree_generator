/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("path");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileItem = void 0;
exports.activate = activate;
const vscode = __webpack_require__(1);
const fs = __webpack_require__(2);
const path = __webpack_require__(3);
function activate(context) {
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
    context.subscriptions.push(vscode.commands.registerCommand('llmFileTree.exclude', (item, selectedItems) => {
        const itemsToProcess = selectedItems?.length > 1 ? selectedItems : [item];
        for (const i of itemsToProcess) {
            FileTreeProvider.exclude(i.resourceUri.fsPath);
            FileTreeProvider.updateItem(i);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('llmFileTree.include', (item, selectedItems) => {
        const itemsToProcess = selectedItems?.length > 1 ? selectedItems : [item];
        for (const i of itemsToProcess) {
            FileTreeProvider.include(i.resourceUri.fsPath);
            FileTreeProvider.updateItem(i);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('llmFileTree.copy', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return;
        const rootPath = workspaceFolders[0].uri.fsPath;
        const treeString = FileTreeProvider.generateStringTree(rootPath, '');
        await vscode.env.clipboard.writeText(path.basename(rootPath) + '\n' + treeString);
        vscode.window.showInformationMessage('Workspace Tree copied to clipboard!');
    }));
}
class FileItem extends vscode.TreeItem {
    resourceUri;
    isDirectory;
    isIgnored;
    collapsibleState;
    childCountDescriptor;
    constructor(resourceUri, isDirectory, isIgnored, collapsibleState, childCountDescriptor) {
        super(resourceUri, collapsibleState);
        this.resourceUri = resourceUri;
        this.isDirectory = isDirectory;
        this.isIgnored = isIgnored;
        this.collapsibleState = collapsibleState;
        this.childCountDescriptor = childCountDescriptor;
        this.contextValue = isIgnored ? 'excluded' : 'included';
        this.iconPath = isIgnored ? new vscode.ThemeIcon('eye-closed') : (isDirectory ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File);
        let desc = '';
        if (isIgnored)
            desc += 'ignoring ';
        if (childCountDescriptor)
            desc += childCountDescriptor;
        this.description = desc.trim();
    }
}
exports.FileItem = FileItem;
class LLMFileTreeProvider {
    defaultExcludeNames;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    manuallyExcluded = new Set();
    manuallyIncluded = new Set();
    constructor(defaultExcludeNames) {
        this.defaultExcludeNames = defaultExcludeNames;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    updateItem(element) {
        this._onDidChangeTreeData.fire(element);
        // We also fire for undefined so parent refreshing shows correct status
        this._onDidChangeTreeData.fire();
    }
    exclude(fsPath) {
        this.manuallyExcluded.add(fsPath);
        this.manuallyIncluded.delete(fsPath);
    }
    include(fsPath) {
        this.manuallyIncluded.add(fsPath);
        this.manuallyExcluded.delete(fsPath);
    }
    isExcluded(fsPath, name) {
        if (this.manuallyIncluded.has(fsPath))
            return false;
        if (this.manuallyExcluded.has(fsPath))
            return true;
        return this.defaultExcludeNames.has(name);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!vscode.workspace.workspaceFolders) {
            return Promise.resolve([]);
        }
        const dirPath = element ? element.resourceUri.fsPath : vscode.workspace.workspaceFolders[0].uri.fsPath;
        let files = [];
        try {
            files = fs.readdirSync(dirPath);
        }
        catch (e) {
            return Promise.resolve([]);
        }
        files.sort((a, b) => {
            const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
            const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
            if (aIsDir && !bIsDir)
                return -1;
            if (!aIsDir && bIsDir)
                return 1;
            return a.localeCompare(b);
        });
        const items = files.map(file => {
            const fullPath = path.join(dirPath, file);
            let isDir = false;
            try {
                isDir = fs.statSync(fullPath).isDirectory();
            }
            catch (e) { }
            const excluded = this.isExcluded(fullPath, file);
            const state = isDir ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
            let childDesc;
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
                                }
                                catch (e) { }
                            }
                        }
                    }
                }
                catch (e) { }
                childDesc = `(${validCount}${hasSubDirs ? '..' : ''})`;
            }
            return new FileItem(vscode.Uri.file(fullPath), isDir, excluded, state, childDesc);
        });
        return Promise.resolve(items);
    }
    generateStringTree(dirPath, prefix) {
        let result = '';
        let files = [];
        try {
            files = fs.readdirSync(dirPath);
        }
        catch (e) {
            return '';
        }
        // Sort: directories first
        files.sort((a, b) => {
            let aIsDir = false, bIsDir = false;
            try {
                aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
            }
            catch (e) { }
            try {
                bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
            }
            catch (e) { }
            if (aIsDir && !bIsDir)
                return -1;
            if (!aIsDir && bIsDir)
                return 1;
            return a.localeCompare(b);
        });
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fullPath = path.join(dirPath, file);
            const isLast = i === files.length - 1;
            let isDirectory = false;
            try {
                isDirectory = fs.statSync(fullPath).isDirectory();
            }
            catch (e) {
                continue;
            }
            const excluded = this.isExcluded(fullPath, file);
            const connector = isLast ? '└── ' : '├── ';
            if (excluded) {
                result += `${prefix}${connector}${file}\n`;
            }
            else {
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

})();

var __webpack_export_target__ = exports;
for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;