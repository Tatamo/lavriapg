import {NullableSet} from "../src/parsergenerator/nullableset";
import {SyntaxDefinitions} from "../src/def/grammar";

const syntax: SyntaxDefinitions = [
	{
		ltoken: "S",
		pattern: ["E"]
	},
	{
		ltoken: "E",
		pattern: ["LIST", "SEMICOLON"]
	},
	{
		ltoken: "E",
		pattern: ["HOGE"]
	},
	{
		ltoken: "LIST",
		pattern: ["T"]
	},
	{
		ltoken: "LIST",
		pattern: ["LIST", "SEPARATE", "T"]
	},
	{
		ltoken: "T",
		pattern: ["ATOM"]
	},
	{
		ltoken: "T",
		pattern: []
	},
	{
		ltoken: "HOGE",
		pattern: ["ID"]
	}
];

describe("NullableSet test", () => {
	const nulls = new NullableSet(syntax);
	test("T is Nullable", () => {
		expect(nulls.isNullable("T")).toBe(true);
	});
	test("LIST is Nullable", () => {
		expect(nulls.isNullable("LIST")).toBe(true);
	});
	test("HOGE is not Nullable", () => {
		expect(nulls.isNullable("HOGE")).toBe(false);
	});
	test("E is not Nullable", () => {
		expect(nulls.isNullable("E")).toBe(false);
	});
	test("S is not Nullable", () => {
		expect(nulls.isNullable("S")).toBe(false);
	});
});
