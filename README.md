# Advanced File Tree Generator

A highly customizable Visual Studio Code extension designed to generate contextual, text-based file tree representations of your workspace. It's the perfect tool for developers who frequently need to provide workspace structures as context to Large Language Models (LLMs) like ChatGPT, Claude, or GitHub Copilot.

## ✨ Features

- **Interactive Tree View**: Adds a dedicated "LLM File Tree" view to your VS Code Activity Bar.
- **Smart Exclusions**: Easily Include `(+)` or Exclude `(-)` files and folders directly from the tree using inline context actions.
- **Intelligent Formatting**: 
  - Generates a neat, text-based tree structure.
  - Ignored folders will still display their name in the tree (giving the LLM context that the folder exists) but will completely hide their child contents, keeping your final output compact!
- **Dynamic Child Counts**: Folders display visual badges (e.g., `(4)`, `(10..)`) to quickly show how many items they contain.
- **One-Click Copy**: A convenient "Copy Tree to Clipboard" button at the top of the view lets you instantly copy the structured text to your clipboard.

## 🚀 Usage

1. Open the **LLM File Tree** tab from the VS Code Activity Bar.
2. Hover over any file or folder inside the tree to reveal the inline **Include (+)** and **Exclude (-)** buttons.
3. Configure the tree by excluding build folders, `node_modules`, or sensitive files. 
4. Click the **Copy Tree to Clipboard** icon at the top of the sidebar.
5. Paste the generated tree structure directly into your LLM prompt!

## 🛠️ Local Development & Installation

If you want to run or modify this extension locally:

1. Clone this repository:
   ```bash
   git clone https://github.com/arvindkumar1422/advanced_file_tree_generator.git
   ```
2. Navigate into the project directory:
   ```bash
   cd advanced_file_tree_generator
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Open the project in VS Code:
   ```bash
   code .
   ```
5. Press `F5` to open a new VS Code Extension Development Host window with the extension loaded.

## 📦 Publishing (Future)

This extension is prepared for publication to the Visual Studio Marketplace. It uses the `@vscode/vsce` CLI tool.
