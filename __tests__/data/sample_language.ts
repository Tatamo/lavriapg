import {Language, LexDefinition, GrammarDefinition} from "../../src/def/language";

export const test_sample_grammar: GrammarDefinition = [
	{
		ltoken: "S",
		pattern: ["E"]
	},
	{
		ltoken: "E",
		pattern: ["LIST", "SEMICOLON"]
	},
	{
		ltoken: "E",
		pattern: ["HOGE"]
	},
	{
		ltoken: "LIST",
		pattern: ["T"]
	},
	{
		ltoken: "LIST",
		pattern: ["LIST", "SEPARATE", "T"]
	},
	{
		ltoken: "T",
		pattern: ["ATOM"]
	},
	{
		ltoken: "T",
		pattern: []
	},
	{
		ltoken: "HOGE",
		pattern: ["ID"]
	}
];

export const test_sample_lex: LexDefinition = [
	{token: "ATOM", pattern: "x"},
	{token: "ID", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/},
	{token: "SEMICOLON", pattern: ";"},
	{token: "SEPARATE", pattern: "|"},
	{token: null, pattern: /(\r\n|\r|\n)+/},
	{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token: "INVALID", pattern: /./}
];

export const test_sample_language: Language = {
	lex: test_sample_lex,
	grammar: test_sample_grammar,
	start_symbol: "S"
};

export const test_empty_language: Language = {
	lex: [],
	grammar: [{ltoken: "S", pattern: []}],
	start_symbol: "S"
};

export const test_calc_grammar: GrammarDefinition = [
	{
		ltoken: "EXP",
		pattern: ["EXP", "PLUS", "TERM"],
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
		callback: (c) => +(c[0])
	},
	{
		ltoken: "ATOM",
		pattern: ["LPAREN", "EXP", "RPAREN"],
		callback: (c) => c[1]
	}
];

export const test_calc_lex: LexDefinition = [
	{token: "DIGITS", pattern: /[1-9][0-9]*/},
	{token: "PLUS", pattern: "+"},
	{token: "ASTERISK", pattern: "*"},
	{token: "LPAREN", pattern: "("},
	{token: "RPAREN", pattern: ")"},
	{token: null, pattern: /(\r\n|\r|\n)+/},
	{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token: "INVALID", pattern: /./}
];

export const test_calc_language: Language = {
	lex: test_calc_lex,
	grammar: test_calc_grammar,
	start_symbol: "EXP"
};

export const test_calc_language_raw_string = `DIGITS		/[1-9][0-9]*/
PLUS		"+"
ASTERISK	"*"
LPAREN		 "("
RPAREN		")"
!ENDLINE	/(\\r\\n|\\r|\\n)+/
!WHITESPACE	/[ \\f\\t\\v\\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000\\ufeff]+/
INVALID		/./

$EXP : EXP PLUS TERM | TERM;
TERM : TERM ASTERISK ATOM | ATOM;
ATOM : DIGITS | LPAREN EXP RPAREN;
`;
