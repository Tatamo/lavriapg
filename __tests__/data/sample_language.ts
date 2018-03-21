import {Language, LexDefinition, GrammarDefinition, DEFAULT_LEX_STATE, LexCallback} from "../../src/def/language";

export const test_sample_grammar: GrammarDefinition = {
	rules: [
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
	],
	start_symbol: "S"
};

export const test_sample_lex: LexDefinition = {
	rules: [
		{token: "ATOM", pattern: "x"},
		{token: "ID", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/},
		{token: "SEMICOLON", pattern: ";"},
		{token: "SEPARATE", pattern: "|"},
		{token: null, pattern: /(\r\n|\r|\n)+/},
		{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
		{token: "INVALID", pattern: /./}
	]
};

export const test_sample_language: Language = {
	lex: test_sample_lex,
	grammar: test_sample_grammar
};

export const test_empty_language: Language = {
	lex: {rules: []},
	grammar: {rules: [{ltoken: "S", pattern: []}], start_symbol: "S"}
};

export const test_calc_grammar: GrammarDefinition = {
	rules: [
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
	],
	start_symbol: "EXP"
};

export const test_calc_lex: LexDefinition = {
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

export const test_calc_language: Language = {
	lex: test_calc_lex,
	grammar: test_calc_grammar
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

export const test_lexstate_lex: LexDefinition = {
	rules: [
		{token: "NUMBER", pattern: /0|[1-9][0-9]*/, state: ["in-parenthesis"]},
		{token: "ID", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/},
		{token: "ASTERISK", pattern: "*", state: ["super-in-parenthesis"]},
		{token: "PLUS", pattern: "+", state: [DEFAULT_LEX_STATE, "in-parenthesis"]},
		{token: "DOLLAR", pattern: "$", state: ["in-braces"]},
		{
			token: "LPAREN", pattern: "(",
			callback: (token, value, lex) => {
				lex.callState("in-parenthesis");
			}
		},
		{
			token: "RPAREN", pattern: ")", state: ["in-parenthesis"],
			callback: (token, value, lex) => {
				lex.returnState();
			}
		},
		{
			token: "LBRACE", pattern: "{",
			callback: (token, value, lex) => {
				lex.callState("in-braces");
			}
		},
		{
			token: "RBRACE", pattern: "}", state: ["in-braces"],
			callback: (token, value, lex) => {
				lex.returnState();
			}
		},
		{token: null, pattern: /(\r\n|\r|\n)+/},
		{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
		{token: "INVALID", pattern: /./, state: [DEFAULT_LEX_STATE, "in-parenthesis"]}
	],
	states: [
		{label: "super-in-parenthesis"},
		{label: "in-parenthesis", inheritance: "super-in-parenthesis"},
		{label: "in-braces", inheritance: DEFAULT_LEX_STATE}
	]
};

export const test_lexstate_language: Language = {
	lex: test_lexstate_lex,
	grammar: {rules: [{ltoken: "S", pattern: []}], start_symbol: "S"}
};

export const test_dynamic_lexrules_lex: LexDefinition = {
	rules: [
		{
			token: "LNEST", pattern: /%+{/,
			callback: ((): LexCallback => {
				let i = 0;
				return (value, token, lex) => {
					const label = i.toString();
					// lex.setState({label, is_exclusive: false});
					lex.callState(label);
					lex.addRule(label, {
						token: "RNEST", pattern: `}${"%".repeat(value.length - 1)}`, state: [label],
						callback: (v, t, l) => {
							l.returnState();
							l.removeRule(label);
							l.removeRule(`${label}-invalid`);
							// lex.removeState(label);
						}
					});
					lex.addRule(`${label}-invalid`, {
						token: "INVALID", pattern: /./, state: [label]
					});
					i++;
				};
			})()
		},
		{token: "INVALID", pattern: /./}
	]
};

export const test_dynamic_lexrules_language: Language = {
	lex: test_dynamic_lexrules_lex,
	grammar: {rules: [{ltoken: "S", pattern: []}], start_symbol: "S"}
};
