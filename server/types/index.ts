import { Range } from "vscode-languageserver-textdocument";

export interface ServerSettings {
    max_number_of_problems: number;
}

export interface SymbolReference {
    uri: string;
    range: Range;
}

export interface SymbolTable {
    [symbol: string]: SymbolReference[];
}