import {constructLanguage, language_language} from "../src/precompiler/ruleparser";
import {ParserGenerator} from "../src/parsergenerator/parsergenerator";
import {Language} from "../src/def/language";

const input = require("fs").readFileSync("language", "utf8");

const ideal_result_language: Language = {
	lex: language_language.lex,
	grammar: language_language.grammar,
	start_symbol: "LANGUAGE"
};

describe("basic language test", () => {

	const parser = new ParserGenerator(language_language).getParser(constructLanguage);
	test("parsing language file", () => {
			expect(parser.parse(input)).toEqual(ideal_result_language);
		}
	);
});
