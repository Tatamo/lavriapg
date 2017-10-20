import {test_sample_language} from "../data/sample_language";
import {SyntaxDB} from "../../src/parsergenerator/syntaxdb";
import {SYMBOL_SYNTAX} from "../../src/def/token";

describe("SyntaxDB test", () => {
	const syntaxdb = new SyntaxDB(test_sample_language);

	describe("findRules test", () => {
		test("get rules of E", () => {
			expect(syntaxdb.findRules("E")).toEqual([
				{id: 1, rule: {ltoken: "E", pattern: ["LIST", "SEMICOLON"]}},
				{id: 2, rule: {ltoken: "E", pattern: ["HOGE"]}}
			]);
		});
		test("get a rule of HOGE", () => {
			expect(syntaxdb.findRules("HOGE")).toEqual([
				{id: 7, rule: {ltoken: "HOGE", pattern: ["ID"]}}
			]);
		});
	});
	describe("getRuleById test", () => {
		test("rule of syntax 1 is: E -> LIST SEMICOLON", () => {
			expect(syntaxdb.getRuleById(1)).toEqual({ltoken: "E", pattern: ["LIST", "SEMICOLON"]});
		});
		test("rule of syntax -1 is: S' -> S", () => {
			expect(syntaxdb.getRuleById(-1)).toEqual({ltoken: SYMBOL_SYNTAX, pattern: ["S"]});
		});
		test("throw error by calling rule of syntax -2", () => {
			expect(() => syntaxdb.getRuleById(-2)).toThrow(/out of range/);
		});
		test("no error occurs in rule of syntax 7", () => {
			expect(() => syntaxdb.getRuleById(7)).not.toThrow();
		});
		test("throw error by calling rule of syntax 8", () => {
			expect(() => syntaxdb.getRuleById(8)).toThrow(/out of range/);
		});
	});
});

