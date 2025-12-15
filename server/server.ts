import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ServerSettings } from "./settings.js";
import { snippet_keywords } from "./snippets/keywords.js";
import { snippet_types } from "./snippets/types.js";
import { snippet_constants } from "./snippets/constants.js";

let server_connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let has_configuration_capability: boolean = false;
let has_workspace_folder_capability: boolean = false;
let has_diagnostic_related_information_capability: boolean = false;

server_connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    has_configuration_capability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    has_workspace_folder_capability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    has_diagnostic_related_information_capability = !!(capabilities.textDocument && capabilities.textDocument.publishDiagnostics && capabilities.textDocument.publishDiagnostics.relatedInformation);

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: [".", ":", " "]
            }
        }
    };

    if (has_workspace_folder_capability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }

    return result;
});

server_connection.onInitialized(() => {
    if (has_configuration_capability) {
        server_connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }

    if (has_workspace_folder_capability) {
        server_connection.workspace.onDidChangeWorkspaceFolders(event => {
            server_connection.console.log("Received Workspace folder change event.");
        });
    }
});

const default_settings: ServerSettings = { max_number_of_problems: 9999 };

let global_settings: ServerSettings = default_settings;
let document_settings: Map<string, Thenable<ServerSettings>> = new Map();

server_connection.onDidChangeConfiguration(change => {
    if (has_configuration_capability) {
        document_settings.clear();
    } else {
        global_settings = <ServerSettings>(
            (change.settings.adnLanguageServer || default_settings)
        );
    }
});

documents.onDidClose(element => {
    document_settings.delete(element.document.uri);
});

server_connection.onDidChangeWatchedFiles(change => {
    server_connection.console.log("Received a file change event.");
});

const keywords: CompletionItem[] = snippet_keywords;
const types: CompletionItem[] = snippet_types;
const constants: CompletionItem[] = snippet_constants;

const all_completions: CompletionItem[] = [
    ...keywords,
    ...types,
    ...constants,
];

server_connection.onCompletion((text_document_position: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(text_document_position.textDocument.uri);
    if (!document) {
        return all_completions;
    }

    const text = document.getText();
    const offset = document.offsetAt(text_document_position.position);
    const line_start = text.lastIndexOf('\n', offset - 1) + 1;
    const line_text = text.substring(line_start, offset);

    if (line_text.trim().endsWith("::") || line_text.match(/::\s*$/)) {
        return types;
    }

    return all_completions;
});

server_connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return item;
});

documents.listen(server_connection);

server_connection.listen();