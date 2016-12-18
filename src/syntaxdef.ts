import * as Lexer from "./lexer"

// 構文規則の定義など
export const SYMBOL_SYNTAX = Symbol("S'");
export const SYMBOL_DOT = Symbol(".");
export interface SyntaxDefinitionSection{
	ltoken: Lexer.Token;
	pattern: Array<Lexer.Token>;
}

export type SyntaxDefinitions = Array<SyntaxDefinitionSection>;

export var def:SyntaxDefinitions = [
	{
		ltoken: "S",
		pattern: ["E", "PLUS", "S"]
	},
	{
		ltoken: "S",
		pattern: ["E"]
	},
	{
		ltoken: "E",
		pattern: ["DIGITS"]
	}
];
export var def_:SyntaxDefinitions = [
	{
		ltoken: "EXP",
		pattern: ["EXP", "PLUS", "TERM"]
	},
	{
		ltoken: "EXP",
		pattern: ["TERM"]
	},
	{
		ltoken: "TERM",
		pattern: ["TERM", "ASTERISK", "ATOM"]
	},
	{
		ltoken: "TERM",
		pattern: ["ATOM"]
	},
	{
		ltoken: "ATOM",
		pattern:["DIGITS"]
	},
	{
		ltoken: "ATOM",
		pattern:["LPAREN", "EXP", "RPAREN"]
	}
];
export var def__:SyntaxDefinitions = [
	{
		ltoken: "S",
		pattern: ["E", "LPAREN", "E"]
	},
	{
		ltoken: "S",
		pattern: ["RPAREN"]
	},
	{
		ltoken: "E",
		pattern: ["E", "PLUS", "T"]
	},
	{
		ltoken: "E",
		pattern: ["T"]
	},
	{
		ltoken: "T",
		pattern: ["DIGITS"]
	},
	{
		ltoken: "T",
		pattern: ["RPAREN"]
	}
];

export var lexrule: SyntaxDefinitions = [
	{
		ltoken: "LEXRULE",
		pattern: ["SECTION", "LEXRULE"]
	},
	{
		ltoken: "LEXRULE",
		pattern: ["SECTION"]
	},
	{
		ltoken: "LEXRULE",
		pattern: ["SECTION"]
	},
	{
		ltoken: "SECTION",
		pattern: ["LABEL", "WHITESPACE", "DEFINITION", "ENDLINE"]
	},
	{
		ltoken: "DEFINITION",
		pattern: ["STRING"]
	},
	{
		ltoken: "DEFINITION",
		pattern: ["REGEXP"]
	}
];
