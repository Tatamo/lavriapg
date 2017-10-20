import {LexDefinition, Language, GrammarDefinition} from "../def/grammar";
import {ParsingOperation, ParsingTable} from "../def/parsingtable";
import {SYMBOL_EOF, Token} from "../def/token";
import {ParserFactory} from "../parser/factory";
import {Parser, ParserCallbackArg} from "../parser/parser";

const lex: LexDefinition = [
	{token: "EXCLAMATION", pattern: "!"},
	{token: "VBAR", pattern: "|"},
	{token: "DOLLAR", pattern: "$"},
	{token: "COLON", pattern: ":"},
	{token: "SEMICOLON", pattern: ";"},
	{token: "LABEL", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/},
	{token: "REGEXP", pattern: /\/.*\/[gimuy]*/},
	{token: "STRING", pattern: /".*"/},
	{token: "STRING", pattern: /'.*'/},
	{token: null, pattern: /(\r\n|\r|\n)+/},
	{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token: "INVALID", pattern: /./}
];

const syntax: GrammarDefinition = [
	{
		ltoken: "GRAMMAR",
		pattern: ["LEX", "SYNTAX"]
	},
	{
		ltoken: "LEX",
		pattern: ["LEX", "LEXSECT"]
	},
	{
		ltoken: "LEX",
		pattern: ["LEXSECT"]
	},
	{
		ltoken: "LEXSECT",
		pattern: ["LEXLABEL", "LEXDEF"]
	},
	{
		ltoken: "LEXLABEL",
		pattern: ["LABEL"]
	},
	{
		ltoken: "LEXLABEL",
		pattern: ["EXCLAMATION"]
	},
	{
		ltoken: "LEXLABEL",
		pattern: ["EXCLAMATION", "LABEL"]
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
		ltoken: "SYNTAX",
		pattern: ["SECT", "SYNTAX"]
	},
	{
		ltoken: "SYNTAX",
		pattern: ["SECT"]
	},
	{
		ltoken: "SECT",
		pattern: ["SECTLABEL", "COLON", "DEF", "SEMICOLON"]
	},
	{
		ltoken: "SECTLABEL",
		pattern: ["LABEL"]
	},
	{
		ltoken: "SECTLABEL",
		pattern: ["DOLLAR", "LABEL"]
	},
	{
		ltoken: "DEF",
		pattern: ["PATTERN", "VBAR", "DEF"]
	},
	{
		ltoken: "DEF",
		pattern: ["PATTERN"]
	},
	{
		ltoken: "PATTERN",
		pattern: ["SYMBOLLIST"]
	},
	{
		ltoken: "PATTERN",
		pattern: []
	},
	{
		ltoken: "SYMBOLLIST",
		pattern: ["LABEL", "SYMBOLLIST"]
	},
	{
		ltoken: "SYMBOLLIST",
		pattern: ["LABEL"]
	}
];

export const grammar_grammar: Language = {lex: lex, syntax: syntax, start_symbol: "GRAMMAR"};

// ASTからGrramaDefinitionを構築
export let constructGrammar = (() => {
	let start_symbol: Token | null = null;
	return (arg: ParserCallbackArg) => {
		const token = arg.token;
		if (arg.terminal == true) {
			const value = arg.value;
			switch (token) {
				case "LABEL":
					return value;
				case "REGEXP":
					const tmp = value.split("/");
					const flags = tmp[tmp.length - 1];
					const p = value.slice(1, -1 - flags.length);
					return new RegExp(p, flags);
				case "STRING":
					return value.slice(1, -1);
			}
		}
		else {
			const children = arg.children;
			const pattern = arg.pattern;
			switch (token) {
				case "GRAMMAR":
					if (start_symbol === null) {
						// 開始記号の指定がない場合、最初の規則に設定
						start_symbol = children[1][0].ltoken;
					}
					return {lex: children[0], syntax: children[1], start_symbol: start_symbol};
				case "LEXDEF":
					return children[0];
				case "LEXLABEL":
					if (pattern[0] == "EXCLAMATION") {
						return null;
					}
					else return children[0];
				case "LEXSECT":
					return {token: children[0], pattern: children[1]};
				case "LEX":
					if (pattern.length == 2) return children[0].concat([children[1]]);
					else return [children[0]];
				case "SYMBOLLIST":
					if (pattern.length == 2) return [children[0]].concat(children[1]);
					else return [children[0]];
				case "PATTERN":
					if (pattern.length == 0) return [];
					else return children[0];
				case "DEF":
					if (pattern.length == 3) return [children[0]].concat(children[2]);
					else return [children[0]];
				case "SECTLABEL":
					if (pattern.length == 2) {
						// 開始記号がまだ指定されていない場合はこれを開始記号とする
						if (start_symbol === null) {
							start_symbol = children[1];
						}
						return children[1];
					}
					return children[0];
				case "SECT":
					const result: GrammarDefinition = [];
					for (const pt of children[2]) {
						result.push({ltoken: children[0], pattern: pt});
					}
					return result;
				case "SYNTAX":
					if (pattern.length == 2) return children[0].concat(children[1]);
					else return children[0];
			}
			return null;
		}
	};
})();


export const grammar_parsing_table: ParsingTable = [
	new Map<Token, ParsingOperation>([
		["GRAMMAR", {type: "goto", to: 1}],
		["LEX", {type: "goto", to: 2}],
		["LEXSECT", {type: "goto", to: 3}],
		["LEXLABEL", {type: "goto", to: 4}],
		["LABEL", {type: "shift", to: 5}],
		["EXCLAMATION", {type: "shift", to: 6}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "accept"}]]),
	new Map<Token, ParsingOperation>([
		["SYNTAX", {type: "goto", to: 7}],
		["LEXSECT", {type: "goto", to: 8}],
		["SECT", {type: "goto", to: 9}],
		["SECTLABEL", {type: "goto", to: 10}],
		["LABEL", {type: "shift", to: 11}],
		["DOLLAR", {type: "shift", to: 12}],
		["LEXLABEL", {type: "goto", to: 4}],
		["EXCLAMATION", {type: "shift", to: 6}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", syntax: 2}],
		["DOLLAR", {type: "reduce", syntax: 2}],
		["EXCLAMATION", {type: "reduce", syntax: 2}]]),
	new Map<Token, ParsingOperation>([
		["LEXDEF", {type: "goto", to: 13}],
		["STRING", {type: "shift", to: 14}],
		["REGEXP", {type: "shift", to: 15}]]),
	new Map<Token, ParsingOperation>([
		["STRING", {type: "reduce", syntax: 4}],
		["REGEXP", {type: "reduce", syntax: 4}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "shift", to: 16}],
		["STRING", {type: "reduce", syntax: 5}],
		["REGEXP", {type: "reduce", syntax: 5}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "reduce", syntax: 0}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", syntax: 1}],
		["DOLLAR", {type: "reduce", syntax: 1}],
		["EXCLAMATION", {type: "reduce", syntax: 1}]]),
	new Map<Token, ParsingOperation>([
		["SECT", {type: "goto", to: 9}],
		["SECTLABEL", {type: "goto", to: 10}],
		["LABEL", {type: "shift", to: 17}],
		["DOLLAR", {type: "shift", to: 12}],
		["SYNTAX", {type: "goto", to: 18}],
		[SYMBOL_EOF, {type: "reduce", syntax: 10}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "shift", to: 19}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "reduce", syntax: 12}],
		["STRING", {type: "reduce", syntax: 4}],
		["REGEXP", {type: "reduce", syntax: 4}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "shift", to: 20}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", syntax: 3}],
		["DOLLAR", {type: "reduce", syntax: 3}],
		["EXCLAMATION", {type: "reduce", syntax: 3}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", syntax: 7}],
		["DOLLAR", {type: "reduce", syntax: 7}],
		["EXCLAMATION", {type: "reduce", syntax: 7}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "reduce", syntax: 8}],
		["DOLLAR", {type: "reduce", syntax: 8}],
		["EXCLAMATION", {type: "reduce", syntax: 8}]]),
	new Map<Token, ParsingOperation>([
		["STRING", {type: "reduce", syntax: 6}],
		["REGEXP", {type: "reduce", syntax: 6}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "reduce", syntax: 12}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "reduce", syntax: 9}]]),
	new Map<Token, ParsingOperation>([
		["DEF", {type: "goto", to: 21}],
		["PATTERN", {type: "goto", to: 22}],
		["SYMBOLLIST", {type: "goto", to: 23}],
		["LABEL", {type: "shift", to: 24}],
		["SEMICOLON", {type: "reduce", syntax: 17}],
		["VBAR", {type: "reduce", syntax: 17}]]),
	new Map<Token, ParsingOperation>([
		["COLON", {type: "reduce", syntax: 13}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "shift", to: 25}]]),
	new Map<Token, ParsingOperation>([
		["VBAR", {type: "shift", to: 26}],
		["SEMICOLON", {type: "reduce", syntax: 15}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "reduce", syntax: 16}],
		["VBAR", {type: "reduce", syntax: 16}]]),
	new Map<Token, ParsingOperation>([
		["LABEL", {type: "shift", to: 24}],
		["SYMBOLLIST", {type: "goto", to: 27}],
		["SEMICOLON", {type: "reduce", syntax: 19}],
		["VBAR", {type: "reduce", syntax: 19}]]),
	new Map<Token, ParsingOperation>([
		[SYMBOL_EOF, {type: "reduce", syntax: 11}],
		["LABEL", {type: "reduce", syntax: 11}],
		["DOLLAR", {type: "reduce", syntax: 11}]]),
	new Map<Token, ParsingOperation>([
		["PATTERN", {type: "goto", to: 22}],
		["DEF", {type: "goto", to: 28}],
		["SYMBOLLIST", {type: "goto", to: 23}],
		["LABEL", {type: "shift", to: 24}],
		["SEMICOLON", {type: "reduce", syntax: 17}],
		["VBAR", {type: "reduce", syntax: 17}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "reduce", syntax: 18}],
		["VBAR", {type: "reduce", syntax: 18}]]),
	new Map<Token, ParsingOperation>([
		["SEMICOLON", {type: "reduce", syntax: 14}]])
];

// 予めParsingTableを用意しておくことで高速化
// export const grammar_parser:Parser = new ParserGenerator(grammar_grammar).getParser(constructGrammar);
export const grammar_parser: Parser = ParserFactory.create(grammar_grammar, grammar_parsing_table, constructGrammar);

