import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
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

    documents.all().forEach(validate_text_document);
});

function get_document_settings(resource: string): Thenable<ServerSettings> {
    if (!has_configuration_capability) {
        return Promise.resolve(global_settings);
    }

    let result = document_settings.get(resource);
    if (!result) {
        result = server_connection.workspace.getConfiguration({
            scopeUri: resource,
            section: "adanLanguageServer"
        });

        document_settings.set(resource, result);
    }

    return result;
}

documents.onDidClose(element => {
    document_settings.delete(element.document.uri);
});

documents.onDidChangeContent(change => {
    validate_text_document(change.document);
});

async function validate_text_document(text_document: TextDocument): Promise<void> {
    let settings = await get_document_settings(text_document.uri);
    let text = text_document.getText();
    let pattern = /\b[A-Z]{2,}\b/g;
    let m: RegExpExecArray | null;
    let problems = 0;
    let diagnostics: Diagnostic[] = [];

    while ((m = pattern.exec(text)) && problems < (settings.max_number_of_problems || 9999)) {
        problems++;

        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: text_document.positionAt(m.index),
                end: text_document.positionAt(m.index + m[0].length)
            },
            message: `${m[0]} is all uppercase.`,
            source: "ex"
        };

        if (has_diagnostic_related_information_capability) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: text_document.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: "Check your spelling. Spelling is important."
                },
                {
                    location: {
                        uri: text_document.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: "Particularly only for names."
                }
            ];
        }

        diagnostics.push(diagnostic);
    }

    server_connection.sendDiagnostics({
        uri: text_document.uri,
        diagnostics
    });
}

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