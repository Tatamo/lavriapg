declare function require(x: string): any;

import {grammar_parser} from "./precompiler/ruleparser";
import {grammar_grammar, constructGrammar} from "./precompiler/ruleparser";

import {ParserGenerator} from "./parsergenerator/parsergenerator";

import {PreCompiler} from "./precompiler/precompiler";

import {LexDefinitions, SyntaxDefinitions, GrammarDefinition} from "./def/grammar";

let input = require("fs").readFileSync("/dev/stdin", "utf8");
// let input = require("fs").readFileSync("grammar", "utf8");

console.time("process");

//let parse_result = grammar_parser.parse(input);

//console.log(JSON.stringify(parse_result));
//console.log(grammar_parser.parse(input));

//console.log(new PreCompiler("./").exec(input));

const syntax:SyntaxDefinitions = [
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
		pattern:["DIGITS"]
	},
	{
		ltoken: "ATOM",
		pattern:["LPAREN", "EXP", "RPAREN"]
	}
];
const lex:LexDefinitions = [
	{token:"DIGITS", pattern:/[1-9][0-9]*/},
	{token:"PLUS", pattern:"+"},
	{token:"ASTERISK", pattern:"*"},
	{token:"LPAREN", pattern:"("},
	{token:"RPAREN", pattern:")"},
	{token:null, pattern:/(\r\n|\r|\n)+/},
	{token:null, pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token:"INVALID", pattern:/./},
];

const grammar:GrammarDefinition = {
	lex: lex,
	syntax: syntax,
	start_symbol: "EXP"
};

//new ParserGenerator(grammar);
//console.log(new ParserGenerator(grammar).getParser().parse("1+1"));
console.log(new ParserGenerator(grammar_grammar).getParser(constructGrammar).parse(input));
//console.log(new ParserGenerator(grammar_grammar).getParsingTable());

console.timeEnd("process");
