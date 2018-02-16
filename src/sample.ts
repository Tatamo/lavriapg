import {readFileSync} from "fs";
import {ParserGenerator} from "./parsergenerator/parsergenerator";
import {Language, LexDefinition, GrammarDefinition} from "./def/language";
import {ParserFactory} from "./parser/factory";

const input = readFileSync("/dev/stdin", "utf8");

const grammar: GrammarDefinition = {
	rules: [
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
	],
	start_symbol: "EXP"
};
const lex: LexDefinition = {
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
const language: Language = {
	lex: lex,
	grammar: grammar
};

console.time("process");
console.log(JSON.stringify(ParserFactory.createAST(language, new ParserGenerator(language).getParsingTable()).parse(input), undefined, 2));
console.timeEnd("process");
