import {ParserGenerator} from "../src/parsergenerator/parsergenerator";
import {test_broken_language} from "./data/broken_language";

describe("Calculator test with broken language", () => {
	// TODO: パーサが壊れていることを(コンソール出力以外で)知る方法
	const pg = new ParserGenerator(test_broken_language);
	const parser = pg.getParser();
	test("parsing table is broken", () => {
		expect(pg.isConflicted()).toBe(true);
		expect(pg.getTableType()).toBe("CONFLICTED");
	});
	test('"1+1" equals 2', () => {
		expect(parser.parse("1+1")).toBe(2);
	});
	test('"( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\\n" equals 28 (to be failed)', () => {
		expect(parser.parse("( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\n")).not.toBe(28);
	});
});
