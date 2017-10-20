import {NullableSet} from "../../src/parsergenerator/nullableset";
import {test_sample_grammar} from "../data/sample_language";

describe("NullableSet test", () => {
	const nulls = new NullableSet(test_sample_grammar);
	test("T is Nullable", () => {
		expect(nulls.isNullable("T")).toBeTruthy();
	});
	test("LIST is Nullable", () => {
		expect(nulls.isNullable("LIST")).toBeTruthy();
	});
	test("HOGE is not Nullable", () => {
		expect(nulls.isNullable("HOGE")).toBeFalsy();
	});
	test("E is not Nullable", () => {
		expect(nulls.isNullable("E")).toBeFalsy();
	});
	test("S is not Nullable", () => {
		expect(nulls.isNullable("S")).toBeFalsy();
	});
});
