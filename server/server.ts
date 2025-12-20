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
import { TextDocument, Range, Position } from "vscode-languageserver-textdocument";
import { ServerSettings, SymbolTable, SymbolReference } from "./types/index.js";
import { snippet_keywords } from "./snippets/keywords.js";
import { snippet_types } from "./snippets/types.js";
import { snippet_constants } from "./snippets/constants.js";
import { snippet_generic_snippets } from "./snippets/generic.js";

let server_connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let symbolTable: SymbolTable = {};
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
            },
            referencesProvider: true,
            renameProvider: true
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
const generic_snippets: CompletionItem[] = snippet_generic_snippets;

const all_completions: CompletionItem[] = [
    ...keywords,
    ...types,
    ...constants,
    ...generic_snippets
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

const getWordRangeAtPosition = (document: TextDocument, position: Position): Range | null => {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const line = lines[position.line];
    if (!line) {
        return null;
    }

    let start = position.character;
    let end = position.character;

    while (start > 0 && /\w/.test(line[start - 1])) {
        start--;
    }
    
    while (end < line.length && /\w/.test(line[end])) {
        end++;
    }

    if (start === end) {
        return null;
    }

    return {
        start: { line: position.line, character: start },
        end: { line: position.line, character: end }
    };
}

documents.onDidChangeContent(change => {
    const document = change.document;
    const text = document.getText();
    symbolTable = {}; // reset

    const words = text.match(/\w+/g) || [];
    words.forEach(word => {
        symbolTable[word] = [];
        let match;
        const regex = new RegExp(`\\b${word}\\b`, "g");
        while ((match = regex.exec(text)) !== null) {
            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + word.length);
            symbolTable[word].push({ uri: document.uri, range: { start, end } });
        }
    });
});

server_connection.onRenameRequest(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
        return null;
    }

    const wordRange = getWordRangeAtPosition(doc, params.position);
    if (!wordRange) {
        return null;
    }

    const oldName = doc.getText(wordRange);
    const refs = symbolTable[oldName] || [];

    const changes: { [uri: string]: { range: Range; newText: string }[] } = {};
    refs.forEach(ref => {
        if (!changes[ref.uri]) {
            changes[ref.uri] = [];
        }
        
        changes[ref.uri].push({ range: ref.range, newText: params.newName });
    });

    return { changes };
});

documents.listen(server_connection);

server_connection.listen();