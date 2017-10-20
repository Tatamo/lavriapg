import {constructLanguage, language_language} from "../src/precompiler/ruleparser";
import {ParserGenerator} from "../src/parsergenerator/parsergenerator";

const input = require("fs").readFileSync("grammar", "utf8");

const ideal_result_language = {
	lex: language_language.lex,
	syntax: language_language.syntax,
	start_symbol: "GRAMMAR"
};

describe("basic grammar test", () => {

	const parser = new ParserGenerator(language_language).getParser(constructLanguage);
	test("parsing grammar file", () => {
			expect(parser.parse(input)).toEqual(ideal_result_language);
		}
	);
});
