import {PreCompiler} from "../../src/precompiler/precompiler";
import {test_calc_grammar_raw_string, test_calc_solver} from "../data/sample_grammar";
import * as fs from "fs";

describe("precompiler test", () => {
	const precompiler = new PreCompiler("../../../dist");
	const source = precompiler.exec(test_calc_grammar_raw_string);
	fs.writeFileSync("./__tests__/data/tmp/precompiler_result.ts", source);
	const p = require("../data/tmp/precompiler_result.ts");
	test("parse \"1+1\" equals to 2 by using copmpiled parser", () => {
		expect(p.parser.parse("1+1", test_calc_solver)).toBe(2);
	});
	fs.unlinkSync("./__tests__/data/tmp/precompiler_result.ts");
});
