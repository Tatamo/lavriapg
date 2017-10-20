import {Language, LexDefinition, GrammarDefinition} from "../../src/def/language";
import {ParserCallbackArg} from "../../src/parser/parser";

export const test_sample_syntax: GrammarDefinition = [
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
	syntax: test_sample_syntax,
	start_symbol: "S"
};

export const test_empty_language: Language = {
	lex: [],
	syntax: [{ltoken: "S", pattern: []}],
	start_symbol: "S"
};

export const test_calc_syntax: GrammarDefinition = [
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
		pattern: ["DIGITS"]
	},
	{
		ltoken: "ATOM",
		pattern: ["LPAREN", "EXP", "RPAREN"]
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
	syntax: test_calc_syntax,
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

export const test_calc_solver = (arg: ParserCallbackArg) => {
	if (arg.terminal) {
		if (arg.token == "DIGITS") {
			return +arg.value;
		}
		return null;
	}
	else if (arg.terminal == false) {
		if (arg.token == "ATOM") {
			if (arg.children.length == 1) {
				return arg.children[0];
			}
			else {
				return arg.children[1];
			}
		}
		else if (arg.token == "TERM") {
			if (arg.children.length == 1) {
				return arg.children[0];
			}
			else {
				return arg.children[0] * arg.children[2];
			}
		}
		else if (arg.token == "EXP") {
			if (arg.children.length == 1) {
				return arg.children[0];
			}
			else {
				return arg.children[0] + arg.children[2];
			}
		}
	}
};
