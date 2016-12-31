// 字句規則で使用する定義
export type Token = string|symbol;
export const SYMBOL_EOF = Symbol("EOF");

export interface LexDefinitionSection{
	token: Token|null;
	pattern: string|RegExp;
}
export type LexDefinitions = Array<LexDefinitionSection>;
export type TokenList = Array<{token:Token, value:string}>;

// 構文規則の定義など
export const SYMBOL_SYNTAX = Symbol("S'");
export const SYMBOL_DOT = Symbol(".");
export interface SyntaxDefinitionSection{
	ltoken: Token;
	pattern: Array<Token>;
}
export type SyntaxDefinitions = Array<SyntaxDefinitionSection>;

export interface GrammarDefinition{
	lex: LexDefinitions;
	syntax: SyntaxDefinitions;
}


