import {language_language, language_parser} from "../src/precompiler/ruleparser";
import {ParserGenerator} from "../src/parsergenerator/parsergenerator";
import {language_language_without_callback} from "./data/language_language";

const input = require("fs").readFileSync("language", "utf8");

describe("language parsing test", () => {
	const parser = new ParserGenerator(language_language).getParser();
	test("parsing language file", () => {
			expect(parser.parse(input)).toEqual(language_language_without_callback);
		}
	);
	/*
	test("language_parser", () => {
		language_parser.
	})*/
});
