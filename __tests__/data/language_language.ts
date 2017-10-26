import {GrammarDefinition, Language, LexDefinition} from "../../src/def/language";

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

const grammar: GrammarDefinition = [
	{
		ltoken: "LANGUAGE",
		pattern: ["LEX", "GRAMMAR"]
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
		ltoken: "GRAMMAR",
		pattern: ["SECT", "GRAMMAR"]
	},
	{
		ltoken: "GRAMMAR",
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

export const language_language_without_callback: Language = {lex: lex, grammar: grammar, start_symbol: "LANGUAGE"};
