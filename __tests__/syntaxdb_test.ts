import {test_sample_grammar} from "./data/sample_grammar";
import {SyntaxDB} from "../src/parsergenerator/syntaxdb";

describe("SyntaxDB test", () => {
	const syntaxdb = new SyntaxDB(test_sample_grammar);

	describe("findDefinition test", () => {
		test("get definition of E", () => {
			expect(syntaxdb.findDefinition("E")).toEqual([
				{id: 1, def: {ltoken: "E", pattern: ["LIST", "SEMICOLON"]}},
				{id: 2, def: {ltoken: "E", pattern: ["HOGE"]}}
			]);
		});
		test("get definition of HOGE", () => {
			expect(syntaxdb.findDefinition("HOGE")).toEqual([
				{id: 7, def: {ltoken: "HOGE", pattern: ["ID"]}}
			]);
		});
	});
	describe("getDefinitionById test", () => {
		test("definition of syntax 1 is: E -> LIST SEMICOLON", () => {
			expect(syntaxdb.getDefinitionById(1)).toEqual({ltoken: "E", pattern: ["LIST", "SEMICOLON"]});
		});
	});
});

