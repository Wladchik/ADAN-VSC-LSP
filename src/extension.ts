// 
//  Learn how to write your own language server/client as a Visual Studio Code
//   extension.
// 
//  https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
// 

import * as path from "node:path";
import {
    workspace,
    ExtensionContext
} from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from "vscode-languageclient/node";
import * as vscode from 'vscode';

let language_client: LanguageClient;

export function activate(context: ExtensionContext) {
    let server_module = context.asAbsolutePath(path.join("out", "server", "server.js"));
    let debug_options = {
        execArgv: ["--nolazy", "--inspect=6009"]
    }; // `--inspect=6009` runs hte server in Node's Inspector mode so VS Code can attach to the server for debugging.

    let server_options: ServerOptions = {
        run: {
            module: server_module,
            transport: TransportKind.ipc
        },
        debug: {
            module: server_module,
            transport: TransportKind.ipc,
            options: debug_options
        }
    };

    let client_options: LanguageClientOptions = {
        documentSelector: [{
            scheme: "file",
            language: "adan"
        }],
        synchronize: {
            fileEvents: workspace.createFileSystemWatcher("**/*.adn")
        }
    };

    language_client = new LanguageClient("adanLanguageServer", "ADAN LSP", server_options, client_options);
    language_client.start();

    const formatter = vscode.languages.registerDocumentFormattingEditProvider('adan', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            const edits: vscode.TextEdit[] = [];
            let indentLevel = 0;

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const trimmed = line.text.trim();

                if (trimmed.length === 0) {
                    continue;
                }

                if (trimmed.startsWith('}')) {
                    indentLevel = Math.max(indentLevel - 1, 0);
                }

                const newText = ' '.repeat(indentLevel * 4) + trimmed;
                if (newText !== line.text) {
                    edits.push(vscode.TextEdit.replace(line.range, newText));
                }

                if (trimmed.endsWith('{')) {
                    indentLevel++;
                }
            }

            return edits;
        }
    });

    context.subscriptions.push(formatter);
}

export function deactivate(): Thenable<void> | undefined {
    if (!language_client) {
        return undefined;
    }

    return language_client.stop();
}