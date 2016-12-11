import * as Lexer from "lexer"

// 構文規則の定義など
export const SYMBOL_SYNTAX = Symbol("S'");
export const SYMBOL_DOT = Symbol(".");
export interface SyntaxDefinitionSection{
	ltoken: Lexer.Token;
	pattern: Array<Array<Lexer.Token>>;
}
// ltokenは重複しないことを前提とする
export type SyntaxDefinitions = Array<SyntaxDefinitionSection>;
/*export var def:SyntaxDefinitions = [
	{
		ltoken: "EXP",
		pattern: [["TERM", "PLUS", "EXP"], ["TERM"]]
	},
	{
		ltoken: "TERM",
		pattern: [["DIGITS"]]
	}
];*/
export var def:SyntaxDefinitions = [
	{
		ltoken: "EXP",
		pattern: [["EXP", "PLUS", "TERM"], ["TERM"]]
	},
	{
		ltoken: "TERM",
		pattern: [["TERM", "ASTERISK", "ATOM"], ["ATOM"]]
	},
	{
		ltoken: "ATOM",
		pattern:[["DIGITS"], ["LPAREN", "EXP", "RPAREN"]]
	}
];
