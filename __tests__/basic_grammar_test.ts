import {readFileSync} from "fs";
import {constructGrammar, grammar_grammar} from "../src/precompiler/ruleparser";
import {ParserGenerator} from "../src/parsergenerator/parsergenerator";

const input = require("fs").readFileSync("grammar", "utf8");

const ideal_result_grammar = {
	lex: grammar_grammar.lex,
	syntax: grammar_grammar.syntax,
	start_symbol: "GRAMMAR"
};

describe("basic grammar test", () => {

	const parser = new ParserGenerator(grammar_grammar).getParser(constructGrammar);
	test("parsing grammar file", () => {
			expect(parser.parse(input)).toEqual(ideal_result_grammar);
		}
	);
});
