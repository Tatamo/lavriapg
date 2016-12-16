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

export var def:SyntaxDefinitions = [
	{
		ltoken: "S",
		pattern: [["E", "PLUS", "S"], ["E"]]
	},
	{
		ltoken: "E",
		pattern: [["DIGITS"]]
	}
];
export var def_:SyntaxDefinitions = [
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

export var def__:SyntaxDefinitions = [
	{
		ltoken: "S",
		pattern: [["E", "LPAREN", "E"], ["RPAREN"]]
	},
	{
		ltoken: "E",
		pattern: [["E", "PLUS", "T"], ["T"]]
	},
	{
		ltoken: "T",
		pattern: [["DIGITS"], ["RPAREN"]]
	}
];
