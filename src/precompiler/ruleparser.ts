import {LexDefinition, Language, GrammarDefinition} from "../def/language";
import {ParsingOperation, ParsingTable} from "../def/parsingtable";
import {SYMBOL_EOF, Token} from "../def/token";
import {ParserFactory} from "../parser/factory";
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
				lex.addRule("body_block", {token: "BODY_BLOCK", pattern: new RegExp(`(?:.|\\s)*?(?<!})(?=${end_delimiter})(?!${end_delimiter}%+)`), states: ["callback"]});
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
			pattern: ["LEX", "GRAMMAR"],
			callback: (c) => {
				let start_symbol = c[1].start_symbol;
				// 開始記号の指定がない場合、最初の規則に設定]
				if (start_symbol === null) {
					if (c[1].sect.length > 0) start_symbol = c[1].sect[0].ltoken;
					else start_symbol = "";
				}
				return {lex: {rules: c[0]}, grammar: {rules: c[1].grammar, start_symbol: start_symbol}};
			}
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
			callback: (c) => ({token: c[1], pattern: c[2], states: c[0]})
		},
		{
			ltoken: "LEXSECT",
			pattern: ["LEXLABEL", "LEXDEF", "LEXCALLBACK"],
			callback: (c) => ({token: c[0], pattern: c[1]})
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
			callback: (c) => [c[1]]
		},
		{
			ltoken: "LEXCALLBACK",
			pattern: ["BLOCK"],
			callback: (c) => [c[0]]
		},
		{
			ltoken: "LEXCALLBACK",
			pattern: [],
			callback: () => []
		},
		{
			ltoken: "GRAMMAR",
			pattern: ["SECT", "GRAMMAR"],
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
			ltoken: "GRAMMAR",
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
				for (const pt of c[2]) {
					result.push({ltoken: c[0].label, pattern: pt});
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
			callback: (c) => [c[0]].concat(c[3])
		},
		{
			ltoken: "DEF",
			pattern: ["PATTERN", "CALLBACK"],
			callback: (c) => [c[0]]
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
			pattern: ["BLOCK"],
			callback: (c) => [c[0]]
		},
		{
			ltoken: "CALLBACK",
			pattern: [],
			callback: () => []
		},
		{
			ltoken: "BLOCK",
			pattern: ["START_BLOCK", "BODY_BLOCK", "END_BLOCK"],
			callback: (c) => [c[1]]
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
