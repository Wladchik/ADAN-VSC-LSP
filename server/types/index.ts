import { Range } from "vscode-languageserver-textdocument";

export interface ServerSettings {
    max_number_of_problems: number;
}

export interface SymbolReference {
    uri: string;
    range: Range;
    parens?: string;
}

export interface SymbolEntry {
    baseName: string;
    fullName: string;
    type?: string;
    args?: string;
    definitions: SymbolReference[];
    usages: SymbolReference[];
}

export interface SymbolTable {
    [symbol: string]: SymbolEntry;
}