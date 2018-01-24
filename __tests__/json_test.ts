import {language_parser} from "../src/precompiler/index";
import {ParserGenerator} from "../src/parsergenerator/index";
import {ParserFactory} from "../src/parser/index";

const input = require("fs").readFileSync("__tests__/data/json_language", "utf8");
describe("json parse test", () => {
	const json_lang = language_parser.parse(input);
	const pg = new ParserGenerator(json_lang);
	const parser = ParserFactory.createAST(json_lang, pg.getParsingTable());

	test("no conflict found", () => {
		expect(pg.getTableType()).toBe("LALR1");
	});

	test("no error occured in parsing", () => {
		const json_input = require("fs").readFileSync("__tests__/data/json_sample.json", "utf8");
		expect(() => parser.parse(json_input)).not.toThrow();
	});
});
