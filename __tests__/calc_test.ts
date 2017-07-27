import {ParserGenerator} from "../src/parsergenerator/parsergenerator";
import {GrammarDefinition, LexDefinitions, SyntaxDefinitions} from "../src/def/grammar";
import {ParserCallbackArg} from "../src/parser";
import {NonterminalCallbackArg} from "../src/parser/parser";

const syntax: SyntaxDefinitions = [
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
const lex: LexDefinitions = [
	{token: "DIGITS", pattern: /[1-9][0-9]*/},
	{token: "PLUS", pattern: "+"},
	{token: "ASTERISK", pattern: "*"},
	{token: "LPAREN", pattern: "("},
	{token: "RPAREN", pattern: ")"},
	{token: null, pattern: /(\r\n|\r|\n)+/},
	{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token: "INVALID", pattern: /./}
];
const grammar: GrammarDefinition = {
	lex: lex,
	syntax: syntax,
	start_symbol: "EXP"
};

const solver = (arg: ParserCallbackArg) => {
	if (arg.terminal) {
		if (arg.token == "DIGITS") {
			return +arg.value;
		}
		return null;
	}
	else {
		arg = arg as NonterminalCallbackArg;
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

describe("Calculator test", () => {
	const parser = new ParserGenerator(grammar).getParser();
	test('"1+1" equals 2', () => {
		expect(parser.parse("1+1", solver)).toBe(2);
	});
	test('"( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\\n" equals 28', () => {
		expect(parser.parse("( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\n", solver)).toBe(28);
	});
});
