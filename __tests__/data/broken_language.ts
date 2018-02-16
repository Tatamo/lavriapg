import {Language, LexDefinition, GrammarDefinition} from "../../src/def/language";

export const test_broken_grammar: GrammarDefinition = {
	rules: [
		{
			ltoken: "EXP",
			pattern: ["EXP", "PLUS", "EXP"],
			callback: (c) => c[0] + c[2]
		},
		{
			ltoken: "EXP",
			pattern: ["TERM"],
			callback: (c) => c[0]
		},
		{
			ltoken: "TERM",
			pattern: ["TERM", "ASTERISK", "ATOM"],
			callback: (c) => c[0] * c[2]
		},
		{
			ltoken: "TERM",
			pattern: ["ATOM"],
			callback: (c) => c[0]
		},
		{
			ltoken: "ATOM",
			pattern: ["DIGITS"],
			callback: (c) => +c[0]
		},
		{
			ltoken: "ATOM",
			pattern: ["LPAREN", "EXP", "RPAREN"],
			callback: (c) => c[1]
		}
	],
	start_symbol: "EXP"
};

export const test_broken_lex: LexDefinition = {
	rules: [
		{token: "DIGITS", pattern: /[1-9][0-9]*/},
		{token: "PLUS", pattern: "+"},
		{token: "ASTERISK", pattern: "*"},
		{token: "LPAREN", pattern: "("},
		{token: "RPAREN", pattern: ")"},
		{token: null, pattern: /(\r\n|\r|\n)+/},
		{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
		{token: "INVALID", pattern: /./}
	]
};

export const test_broken_language: Language = {
	lex: test_broken_lex,
	grammar: test_broken_grammar
};
