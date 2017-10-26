import {PreCompiler} from "../../src/precompiler/precompiler";
import {test_calc_language_raw_string} from "../data/sample_language";
import * as fs from "fs";

describe("precompiler test", () => {
	const precompiler = new PreCompiler("../../../dist");
	const source = precompiler.exec(test_calc_language_raw_string);
	fs.writeFileSync("./__tests__/data/tmp/precompiler_result.ts", source);
	const p = require("../data/tmp/precompiler_result.ts");
	test("parse \"1+1\" by using compiled parser", () => {
		expect(() => p.parser.parse("1+1")).not.toThrow();
	});
	// TODO: 外部からcallbackを与えられるようにする
	test("parse \"1+1\" equals to 2 by using copmpiled parser", () => {
		expect(p.parser.parse("1+1")).toBe(2);
	});
	fs.unlinkSync("./__tests__/data/tmp/precompiler_result.ts");
});
