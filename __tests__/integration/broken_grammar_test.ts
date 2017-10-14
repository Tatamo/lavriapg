import {ParserGenerator} from "../../src/parsergenerator/parsergenerator";
import {test_broken_grammar} from "../data/broken_grammar";
import {test_calc_solver} from "../data/sample_grammar";

describe("Calculator test with broken grammar", () => {
	// TODO: パーサが壊れていることを(コンソール出力以外で)知る方法
	const parser = new ParserGenerator(test_broken_grammar).getParser();
	test('"1+1" equals 2', () => {
		expect(parser.parse("1+1", test_calc_solver)).toBe(2);
	});
	test('"( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\\n" equals 28 (to be failed)', () => {
		expect(parser.parse("( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\n", test_calc_solver)).not.toBe(28);
	});
});
