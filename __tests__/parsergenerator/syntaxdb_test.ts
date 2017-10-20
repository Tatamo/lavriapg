import {test_sample_language} from "../data/sample_language";
import {GrammarDB} from "../../src/parsergenerator/grammardb";
import {SYMBOL_SYNTAX} from "../../src/def/token";

describe("GrammarDB test", () => {
	const grammardb = new GrammarDB(test_sample_language);

	describe("findRules test", () => {
		test("get rules of E", () => {
			expect(grammardb.findRules("E")).toEqual([
				{id: 1, rule: {ltoken: "E", pattern: ["LIST", "SEMICOLON"]}},
				{id: 2, rule: {ltoken: "E", pattern: ["HOGE"]}}
			]);
		});
		test("get a rule of HOGE", () => {
			expect(grammardb.findRules("HOGE")).toEqual([
				{id: 7, rule: {ltoken: "HOGE", pattern: ["ID"]}}
			]);
		});
	});
	describe("getRuleById test", () => {
		test("rule of grammar 1 is: E -> LIST SEMICOLON", () => {
			expect(grammardb.getRuleById(1)).toEqual({ltoken: "E", pattern: ["LIST", "SEMICOLON"]});
		});
		test("rule of grammar -1 is: S' -> S", () => {
			expect(grammardb.getRuleById(-1)).toEqual({ltoken: SYMBOL_SYNTAX, pattern: ["S"]});
		});
		test("throw error by calling rule of grammar -2", () => {
			expect(() => grammardb.getRuleById(-2)).toThrow(/out of range/);
		});
		test("no error occurs in rule of grammar 7", () => {
			expect(() => grammardb.getRuleById(7)).not.toThrow();
		});
		test("throw error by calling rule of grammar 8", () => {
			expect(() => grammardb.getRuleById(8)).toThrow(/out of range/);
		});
	});
});

