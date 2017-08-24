import {ParserGenerator} from "../../../src/parsergenerator/parsergenerator";
import {test_calc_grammar, test_calc_solver} from "../../data/sample_grammar";

describe("Calculator test", () => {
	const parser = new ParserGenerator(test_calc_grammar).getParser();
	test('"1+1" equals 2', () => {
		expect(parser.parse("1+1", test_calc_solver)).toBe(2);
	});
	test('"( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\\n" equals 28', () => {
		expect(parser.parse("( 1+1 )*3 + ( (1+1) * (1+2*3+4) )\n", test_calc_solver)).toBe(28);
	});
});
