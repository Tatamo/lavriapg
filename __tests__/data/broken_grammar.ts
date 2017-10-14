import {GrammarDefinition, LexDefinitions, SyntaxDefinitions} from "../../src/def/grammar";

export const test_broken_syntax: SyntaxDefinitions = [
	{
		ltoken: "EXP",
		pattern: ["EXP", "PLUS", "EXP"]
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
		pattern: ["DIGITS"]
	},
	{
		ltoken: "ATOM",
		pattern: ["LPAREN", "EXP", "RPAREN"]
	}
];

export const test_broken_lex: LexDefinitions = [
	{token: "DIGITS", pattern: /[1-9][0-9]*/},
	{token: "PLUS", pattern: "+"},
	{token: "ASTERISK", pattern: "*"},
	{token: "LPAREN", pattern: "("},
	{token: "RPAREN", pattern: ")"},
	{token: null, pattern: /(\r\n|\r|\n)+/},
	{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token: "INVALID", pattern: /./}
];

export const test_broken_grammar: GrammarDefinition = {
	lex: test_broken_lex,
	syntax: test_broken_syntax,
	start_symbol: "EXP"
};
