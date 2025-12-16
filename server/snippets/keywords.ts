import { CompletionItem, CompletionItemKind, InsertTextFormat, MarkupKind } from "vscode-languageserver/node";

export const snippet_keywords: CompletionItem[] = [
    {
        label: "if",
        kind: CompletionItemKind.Keyword,
        detail: "Compare two values and execute code conditionally.",
        documentation: "```adan\nif (condition) {\n    // Runs if condition is true\n}\n```",

        insertText: "if (${1:condition}) {\n\t${0}\n}",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "else",
        kind: CompletionItemKind.Keyword,
        detail: "Execute code when the previous 'if' condition is false.",
        documentation: "```adan\nif (condition) {\n    // Runs if condition is true\n} else {\n    // Runs if condition is false\n}\n```",

        insertText: "else {\n\t${0}\n}",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "while",
        kind: CompletionItemKind.Keyword,
        detail: "Create a loop that runs while a condition is true.",
        documentation: "```adan\nwhile (condition) {\n    // Code to repeat while condition is true\n}\n```",

        insertText: "while (${1:condition}) {\n\t${0}\n}",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "for",
        kind: CompletionItemKind.Keyword,
        detail: "Create a loop that iterates over a range of values.",
        documentation: "```adan\nfor (initialization; condition; increment) {\n    // Code to repeat\n}\n```",

        insertText: "for (${1:i::int = 0}; ${2:i < 10}; ${3:i++}) {\n\t${0}\n}",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "return",
        kind: CompletionItemKind.Keyword,
        detail: "Exit a function and optionally return a value.",
        documentation: "```adan\nreturn value;\n```",

        insertText: "return;",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "break",
        kind: CompletionItemKind.Keyword,
        detail: "Exit the nearest enclosing loop.",
        documentation: "```adan\nbreak;\n```",

        insertText: "break;",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "continue",
        kind: CompletionItemKind.Keyword,
        detail: "Skip to the next iteration of the nearest enclosing loop.",
        documentation: "```adan\ncontinue;\n```",

        insertText: "continue;",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "include",
        kind: CompletionItemKind.Keyword,
        detail: "Add in functionality from another file, whether user-defined or a library.",
        documentation: "```adan\ninclude \"<publisher>.<package>\";\n```",

        insertText: "include ${0};",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "program",
        kind: CompletionItemKind.Keyword,
        detail: "Define a new function block that encapsulates code to be executed.",
        documentation: "```adan\nprogram::void my_function() {\n    // Function body\n}\n```",

        insertText: "program::${1:void} ${2:function_name}(${3:parameters}) {\n\t${0}\n}",
        insertTextFormat: InsertTextFormat.Snippet
    },
    {
        label: "init",
        kind: CompletionItemKind.Keyword,
        detail: "Define starting point of a ADAN program.",
        documentation: "```adan\ninclude adan.io;\n\nprogram::int main() {\n\treturn 0;\n}\n```",

        insertText: "include adan.io;\n\nprogram::void main() {\n\treturn;\n}",
        insertTextFormat: InsertTextFormat.Snippet
    }
];