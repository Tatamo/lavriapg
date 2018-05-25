import {LexDefinition, Language, GrammarDefinition, LexStateLabel, LexState} from "../def/language";
import {ParsingOperation, ParsingTable} from "../def/parsingtable";
import {SYMBOL_EOF, Token} from "../def/token";
import {Parser} from "../parser/parser";
import {ParserGenerator} from "../parsergenerator/parsergenerator";

const lex: LexDefinition = {
	rules: [
		{token: "EXCLAMATION", pattern: "!"},
		{token: "VBAR", pattern: "|"},
		{token: "DOLLAR", pattern: "$"},
		{token: "COLON", pattern: ":"},
		{token: "SEMICOLON", pattern: ";"},
		{token: "LT", pattern: "<"},
		{token: "GT", pattern: ">"},
		{token: "COMMA", pattern: ","},
		{token: "LEX_BEGIN", pattern: "#lex_begin"},
		{token: "LEX_END", pattern: "#lex_end"},
		{token: "LEX_DEFAULT", pattern: "#lex_default"},
		{token: "START", pattern: "#start"},
		{token: "EXTEND", pattern: "#extend"},
		{token: "BEGIN", pattern: "#begin"},
		{token: "END", pattern: "#end"},
		{token: "DEFAULT", pattern: "#default"},
		{token: "LABEL", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/},
		{
			token: "REGEXP", pattern: /\/.*\/[gimuy]*/,
			callback: (v) => {
				const tmp = v.split("/");
				const flags = tmp[tmp.length - 1];
				const p = v.slice(1, -1 - flags.length);
				return ["REGEXP", new RegExp(p, flags)];
			}
		},
		{token: "STRING", pattern: /".*"/, callback: (v) => ["STRING", v.slice(1, -1)]},
		{token: "STRING", pattern: /'.*'/, callback: (v) => ["STRING", v.slice(1, -1)]},
		{
			token: "START_BLOCK", pattern: /%*{+/,
			callback: (value, token, lex) => {
				const match = /(%*)({+)/.exec(value)!;
				const end_delimiter = "}".repeat(match[2].length) + match[1]!;
				lex.callState("callback");
				lex.addRule("body_block", {token: "BODY_BLOCK", pattern: new RegExp(`(?:.|\\s)*?(?<!})(?=${end_delimiter})(?!${end_delimiter}%+)(?!${end_delimiter}}+)`), states: ["callback"]});
				lex.addRule("end_block", {
					token: "END_BLOCK", pattern: end_delimiter, states: ["callback"],
					callback: (value, token, lex) => {
						lex.returnState();
						lex.removeRule("body_block");
						lex.removeRule("end_block");
					}
				});
			}
		},
		{token: null, pattern: /(\r\n|\r|\n)+/},
		{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
		{token: "INVALID", pattern: /./}
	]
};

const grammar: GrammarDefinition = {
	rules: [
		{
			ltoken: "LANGUAGE",
			pattern: ["LEX_OPTIONS", "LEX", "EX_CALLBACKS", "GRAMMAR"],
			callback: (c) => {
				let start_symbol = c[3].start_symbol;
				// 開始記号の指定がない場合、最初の規則に設定]
				if (start_symbol === null) {
					if (c[3].sect.length > 0) start_symbol = c[3].sect[0].ltoken;
					else start_symbol = "";
				}
				const lex: LexDefinition = {rules: c[1]};
				if (c[0].callbacks !== undefined) {
					for (const callback of c[0].callbacks) {
						switch (callback.type) {
							case "#lex_begin":
								lex.begin_callback = callback.callback;
								break;
							case "#lex_end":
								lex.end_callback = callback.callback;
								break;
							case "#lex_default":
								lex.default_callback = callback.callback;
								break;
						}
					}
				}
				if (c[0].start_state !== undefined) {
					lex.start_state = c[0].start_state;
				}
				if (c[0].states.length > 0) {
					lex.states = c[0].states;
				}
				const grammar: GrammarDefinition = {rules: c[3].grammar, start_symbol};
				if (c[2] !== undefined) {
					for (const callback of c[2]) {
						switch (callback.type) {
							case "#begin":
								grammar.begin_callback = callback.callback;
								break;
							case "#end":
								grammar.end_callback = callback.callback;
								break;
							case "#default":
								grammar.default_callback = callback.callback;
								break;
						}
					}
				}
				return {lex, grammar};
			}
		},
		{
			ltoken: "LANGUAGE",
			pattern: ["LEX_OPTIONS", "LEX", "GRAMMAR"],
			callback: (c) => {
				let start_symbol = c[2].start_symbol;
				// 開始記号の指定がない場合、最初の規則に設定]
				if (start_symbol === null) {
					if (c[2].sect.length > 0) start_symbol = c[2].sect[0].ltoken;
					else start_symbol = "";
				}
				const lex: LexDefinition = {rules: c[1]};
				if (c[0].callbacks !== undefined) {
					for (const callback of c[0].callbacks) {
						switch (callback.type) {
							case "#lex_begin":
								lex.begin_callback = callback.callback;
								break;
							case "#lex_end":
								lex.end_callback = callback.callback;
								break;
							case "#lex_default":
								lex.default_callback = callback.callback;
								break;
						}
					}
				}
				if (c[0].start_state !== undefined) {
					lex.start_state = c[0].start_state;
				}
				if (c[0].states.length > 0) {
					lex.states = c[0].states;
				}
				return {lex, grammar: {rules: c[2].grammar, start_symbol: start_symbol}};
			}
		},
		{
			ltoken: "LEX_OPTIONS",
			pattern: ["OPTIONAL_LEX_EX_CALLBACKS", "LEX_STATES"],
			callback: (c) => {
				const states: Array<LexState> = [];
				const states_set = new Set<LexStateLabel>();
				for (const inherit of c[1].inheritance) {
					for (const sub_state of inherit.sub) {
						if (states_set.has(inherit.sub)) {
							// 既に登録されている場合、一つのstateが複数のstateを継承することはできない
							continue;
						}
						states.push({label: sub_state, inheritance: inherit.base});
						states_set.add(sub_state);
					}
				}
				return {callbacks: c[0], start_state: c[1].start_state, states};
			}
		},
		{
			ltoken: "LEX_STATES",
			pattern: ["LEX_STATES", "LEXSTATE_DEFINITIONS"],
			callback: ([c1, c2]) => {
				if (c2.type === "#start") {
					c1.start_state = c2.value;
				}
				else if (c2.type === "#extend") {
					c1.inheritance.push(c2.value);
				}
				return c1;
			}
		},
		{
			ltoken: "LEX_STATES",
			pattern: [],
			callback: () => ({start_state: undefined, inheritance: []})
		},
		{
			ltoken: "LEXSTATE_DEFINITIONS",
			pattern: ["STARTSTATE"],
			callback: ([c]) => ({type: "#start", value: c})
		},
		{
			ltoken: "LEXSTATE_DEFINITIONS",
			pattern: ["STATE_EXTEND"],
			callback: ([c]) => ({type: "#extend", value: c})
		},
		{
			ltoken: "STARTSTATE",
			pattern: ["START", "LEXSTATE"],
			callback: (c) => c[1]
		},
		{
			ltoken: "STATE_EXTEND",
			pattern: ["EXTEND", "MULTIPLE_LEXSTATE", "LEXSTATE"],
			callback: (c) => ({sub: c[1], base: c[2]})
		},
		{
			ltoken: "OPTIONAL_LEX_EX_CALLBACKS",
			pattern: ["LEX_EX_CALLBACKS"]
		},
		{
			ltoken: "OPTIONAL_LEX_EX_CALLBACKS",
			pattern: []
		},
		{
			ltoken: "LEX_EX_CALLBACKS",
			pattern: ["LEX_EX_CALLBACKS", "LEX_EX_CALLBACK"],
			callback: (c) => c[0].concat([c[1]])
		},
		{
			ltoken: "LEX_EX_CALLBACKS",
			pattern: ["LEX_EX_CALLBACK"],
			callback: (c) => [c[0]]
		},
		{
			ltoken: "LEX_EX_CALLBACK",
			pattern: ["LEX_EX_CALLBACK_LABEL", "BLOCK"],
			callback: (c) => ({type: c[0], callback: c[1]})
		},
		{
			ltoken: "LEX_EX_CALLBACK_LABEL",
			pattern: ["LEX_BEGIN"]
		},
		{
			ltoken: "LEX_EX_CALLBACK_LABEL",
			pattern: ["LEX_END"]
		},
		{
			ltoken: "LEX_EX_CALLBACK_LABEL",
			pattern: ["LEX_DEFAULT"]
		},
		{
			ltoken: "LEX",
			pattern: ["LEX", "LEXSECT"],
			callback: (c) => c[0].concat([c[1]])
		},
		{
			ltoken: "LEX",
			pattern: ["LEXSECT"],
			callback: (c) => [c[0]]
		},
		{
			ltoken: "LEXSECT",
			pattern: ["MULTIPLE_LEXSTATE", "LEXLABEL", "LEXDEF", "LEXCALLBACK"],
			callback: (c) => (c[3] === undefined ? {token: c[1], pattern: c[2], states: c[0]} : {token: c[1], pattern: c[2], states: c[0], callback: [3]})
		},
		{
			ltoken: "LEXSECT",
			pattern: ["LEXLABEL", "LEXDEF", "LEXCALLBACK"],
			callback: (c) => (c[2] === undefined ? {token: c[0], pattern: c[1]} : {token: c[0], pattern: c[1], callback: c[2]})
		},
		{
			ltoken: "LEXLABEL",
			pattern: ["LABEL"]
		},
		{
			ltoken: "LEXLABEL",
			pattern: ["EXCLAMATION"],
			callback: () => null
		},
		{
			ltoken: "LEXLABEL",
			pattern: ["EXCLAMATION", "LABEL"],
			callback: () => null
		},
		{
			ltoken: "LEXDEF",
			pattern: ["STRING"]
		},
		{
			ltoken: "LEXDEF",
			pattern: ["REGEXP"]
		},
		{
			ltoken: "MULTIPLE_LEXSTATE",
			pattern: ["LT", "LEXSTATE_LIST", "GT"],
			callback: (c) => c[1]
		},
		{
			ltoken: "LEXSTATE_LIST",
			pattern: ["LABEL", "COMMA", "LEXSTATE_LIST"],
			callback: (c) => [c[0], ...c[2]]
		},
		{
			ltoken: "LEXSTATE_LIST",
			pattern: ["LABEL"],
			callback: (c) => [c[0]]
		},
		{
			ltoken: "LEXSTATE",
			pattern: ["LT", "LABEL", "GT"],
			callback: (c) => c[1]
		},
		{
			ltoken: "LEXCALLBACK",
			pattern: ["BLOCK"]
		},
		{
			ltoken: "LEXCALLBACK",
			pattern: []
		},
		{
			ltoken: "EX_CALLBACKS",
			pattern: ["EX_CALLBACKS", "EX_CALLBACK"],
			callback: (c) => c[0].concat([c[1]])
		},
		{
			ltoken: "EX_CALLBACKS",
			pattern: ["EX_CALLBACK"],
			callback: (c) => [c[0]]
		},
		{
			ltoken: "EX_CALLBACK",
			pattern: ["EX_CALLBACK_LABEL", "BLOCK"],
			callback: (c) => ({type: c[0], callback: c[1]})
		},
		{
			ltoken: "EX_CALLBACK_LABEL",
			pattern: ["BEGIN"]
		},
		{
			ltoken: "EX_CALLBACK_LABEL",
			pattern: ["END"]
		},
		{
			ltoken: "EX_CALLBACK_LABEL",
			pattern: ["DEFAULT"]
		},
		{
			ltoken: "GRAMMAR",
			pattern: ["RULES"]
		},
		{
			ltoken: "RULES",
			pattern: ["SECT", "RULES"],
			callback: (c) => {
				let start_symbol = c[1].start_symbol;
				if (c[0].start_symbol !== null) {
					start_symbol = c[0].start_symbol;
				}
				return {
					start_symbol,
					grammar: c[0].sect.concat(c[1].grammar)
				};
			}
		},
		{
			ltoken: "RULES",
			pattern: ["SECT"],
			callback: (c) => {
				let start_symbol = null;
				if (c[0].start_symbol !== null) {
					start_symbol = c[0].start_symbol;
				}
				return {
					start_symbol,
					grammar: c[0].sect
				};
			}
		},
		{
			ltoken: "SECT",
			pattern: ["SECTLABEL", "COLON", "DEF", "SEMICOLON"],
			callback: (c) => {
				const result = [];
				for (const def of c[2]) {
					result.push({ltoken: c[0].label, ...def});
				}
				return {start_symbol: c[0].start_symbol, sect: result};
			}
		},
		{
			ltoken: "SECTLABEL",
			pattern: ["LABEL"],
			callback: (c) => ({start_symbol: null, label: c[0]})
		},
		{
			ltoken: "SECTLABEL",
			pattern: ["DOLLAR", "LABEL"],
			callback: (c) => ({start_symbol: c[1], label: c[1]})
		},
		{
			ltoken: "DEF",
			pattern: ["PATTERN", "CALLBACK", "VBAR", "DEF"],
			callback: (c) => [c[1] === null ? {pattern: c[0]} : {pattern: c[0], callback: c[1]}].concat(c[3])
		},
		{
			ltoken: "DEF",
			pattern: ["PATTERN", "CALLBACK"],
			callback: (c) => [c[1] === null ? {pattern: c[0]} : {pattern: c[0], callback: c[1]}]
		},
		{
			ltoken: "PATTERN",
			pattern: ["SYMBOLLIST"]
		},
		{
			ltoken: "PATTERN",
			pattern: [],
			callback: () => []
		},
		{
			ltoken: "SYMBOLLIST",
			pattern: ["LABEL", "SYMBOLLIST"],
			callback: (c) => [c[0]].concat(c[1])
		},
		{
			ltoken: "SYMBOLLIST",
			pattern: ["LABEL"],
			callback: (c) => [c[0]]
		},
		{
			ltoken: "CALLBACK",
			pattern: ["BLOCK"]
		},
		{
			ltoken: "CALLBACK",
			pattern: [],
			callback: () => null
		},
		{
			ltoken: "BLOCK",
			pattern: ["START_BLOCK", "BODY_BLOCK", "END_BLOCK"],
			callback: (c) => c[1]
		}
	], start_symbol: "LANGUAGE"
};

/**
 * 言語定義文法の言語定義
 * @type Language
 */
export const language_language: Language = {lex: lex, grammar: grammar};

// 予めParsingTableを用意しておくことで高速化
/**
 * 言語定義文法の言語定義、の構文解析表
 * @type ParsingTable
 */
export const language_parsing_table: ParsingTable = [
	new Map<Token, ParsingOperation>([
		["LANGUAGE", {type: "goto", to: 1}],
		["LEX", {type: "goto", to: 2}],
		["LEXSECT", {type: "goto", to: 3}],
		["LEXLABEL", {type: "goto", to: 4}],
		["LABEL", {type: "shift", to: 5}],
		["EXCLAMATION", {type: "shift", to: 6}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "accept"}]]),
	new Map<Token, ParsingOperation>([
		["GRAMMAR", {type: "goto", to: 7}],
		["LEXSECT", {type: "goto", to: 8}],
		["SECT", {type: "goto", to: 9}],
		["SECTLABEL", {type: "goto", to: 10}],
		["LABEL", {type: "shift", to: 11}],
		["DOLLAR", {type: "shift", to: 12}],
		["LEXLABEL", {type: "goto", to: 4}],
		["EXCLAMATION", {type: "shift", to: 6}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", grammar_id: 2}],
		["DOLLAR", {type: "reduce", grammar_id: 2}],
		["EXCLAMATION", {type: "reduce", grammar_id: 2}]]),
	new Map<Token, ParsingOperation>([
		["LEXDEF", {type: "goto", to: 13}],
		["STRING", {type: "shift", to: 14}],
		["REGEXP", {type: "shift", to: 15}]]),
	new Map<Token, ParsingOperation>([
		["STRING", {type: "reduce", grammar_id: 4}],
		["REGEXP", {type: "reduce", grammar_id: 4}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "shift", to: 16}],
		["STRING", {type: "reduce", grammar_id: 5}],
		["REGEXP", {type: "reduce", grammar_id: 5}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "reduce", grammar_id: 0}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", grammar_id: 1}],
		["DOLLAR", {type: "reduce", grammar_id: 1}],
		["EXCLAMATION", {type: "reduce", grammar_id: 1}]]),
	new Map<Token, ParsingOperation>([
		["SECT", {type: "goto", to: 9}],
		["SECTLABEL", {type: "goto", to: 10}],
		["LABEL", {type: "shift", to: 17}],
		["DOLLAR", {type: "shift", to: 12}],
		["GRAMMAR", {type: "goto", to: 18}],
		[SYMBOL_EOF, {type: "reduce", grammar_id: 10}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "shift", to: 19}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "reduce", grammar_id: 12}],
		["STRING", {type: "reduce", grammar_id: 4}],
		["REGEXP", {type: "reduce", grammar_id: 4}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "shift", to: 20}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", grammar_id: 3}],
		["DOLLAR", {type: "reduce", grammar_id: 3}],
		["EXCLAMATION", {type: "reduce", grammar_id: 3}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", grammar_id: 7}],
		["DOLLAR", {type: "reduce", grammar_id: 7}],
		["EXCLAMATION", {type: "reduce", grammar_id: 7}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", grammar_id: 8}],
		["DOLLAR", {type: "reduce", grammar_id: 8}],
		["EXCLAMATION", {type: "reduce", grammar_id: 8}]]),
	new Map<Token, ParsingOperation>([
		["STRING", {type: "reduce", grammar_id: 6}],
		["REGEXP", {type: "reduce", grammar_id: 6}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "reduce", grammar_id: 12}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "reduce", grammar_id: 9}]]),
	new Map<Token, ParsingOperation>([
		["DEF", {type: "goto", to: 21}],
		["PATTERN", {type: "goto", to: 22}],
		["SYMBOLLIST", {type: "goto", to: 23}],
		["LABEL", {type: "shift", to: 24}],
		["SEMICOLON", {type: "reduce", grammar_id: 17}],
		["VBAR", {type: "reduce", grammar_id: 17}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "reduce", grammar_id: 13}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "shift", to: 25}]]),
	new Map<Token, ParsingOperation>([
		["VBAR", {type: "shift", to: 26}],
		["SEMICOLON", {type: "reduce", grammar_id: 15}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "reduce", grammar_id: 16}],
		["VBAR", {type: "reduce", grammar_id: 16}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "shift", to: 24}],
		["SYMBOLLIST", {type: "goto", to: 27}],
		["SEMICOLON", {type: "reduce", grammar_id: 19}],
		["VBAR", {type: "reduce", grammar_id: 19}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "reduce", grammar_id: 11}],
		["LABEL", {type: "reduce", grammar_id: 11}],
		["DOLLAR", {type: "reduce", grammar_id: 11}]]),
	new Map<Token, ParsingOperation>([
		["PATTERN", {type: "goto", to: 22}],
		["DEF", {type: "goto", to: 28}],
		["SYMBOLLIST", {type: "goto", to: 23}],
		["LABEL", {type: "shift", to: 24}],
		["SEMICOLON", {type: "reduce", grammar_id: 17}],
		["VBAR", {type: "reduce", grammar_id: 17}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "reduce", grammar_id: 18}],
		["VBAR", {type: "reduce", grammar_id: 18}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "reduce", grammar_id: 14}]])
];

/**
 * 言語定義ファイルを読み込むための構文解析器
 * @type {Parser}
 */

// language_parsing_tableの用意がまだなので直接生成する
// export const language_parser: Parser = ParserFactory.create(language_language, language_parsing_table);
export const language_parser: Parser = new ParserGenerator(language_language).getParser();
