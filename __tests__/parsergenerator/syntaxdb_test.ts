import {test_sample_language} from "../data/sample_language";
import {SyntaxDB} from "../../src/parsergenerator/syntaxdb";
import {SYMBOL_SYNTAX} from "../../src/def/token";

describe("SyntaxDB test", () => {
	const syntaxdb = new SyntaxDB(test_sample_language);

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
		test("definition of syntax -1 is: S' -> S", () => {
			expect(syntaxdb.getDefinitionById(-1)).toEqual({ltoken: SYMBOL_SYNTAX, pattern: ["S"]});
		});
		test("throw error by calling definition of syntax -2", () => {
			expect(() => syntaxdb.getDefinitionById(-2)).toThrow(/out of range/);
		});
		test("no error occurs in definition of syntax 7", () => {
			expect(() => syntaxdb.getDefinitionById(7)).not.toThrow();
		});
		test("throw error by calling definition of syntax 8", () => {
			expect(() => syntaxdb.getDefinitionById(8)).toThrow(/out of range/);
		});
	});
});

