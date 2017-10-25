import {Parser} from "../../src/parser/parser";
import {ParserFactory} from "../../src/parser/factory";
import {ParserGenerator} from "../../src/parsergenerator/parsergenerator";
import {test_calc_language, test_calc_language_with_solver, test_calc_solver} from "../data/sample_language";
import {Lexer} from "../../src/lexer/lexer";

describe("parser test", () => {
	const parsingtable = new ParserGenerator(test_calc_language).getParsingTable();
	const parser = ParserFactory.create(test_calc_language, new ParserGenerator(test_calc_language).getParsingTable());
	test("parser factory", () => {
		expect(ParserFactory.create(test_calc_language, parsingtable)).toBeInstanceOf(Parser);
	});
	test("getting calc language ast", () => {
		expect(parser.parse("1+1")).toEqual({
			type: "EXP", value: null, children:
				[
					{type: "EXP", value: null, children: [{type: "TERM", value: null, children: [{type: "ATOM", value: null, children: [{type: "DIGITS", value: "1", children: []}]}]}]},
					{type: "PLUS", value: "+", children: []},
					{type: "TERM", value: null, children: [{type: "ATOM", value: null, children: [{type: "DIGITS", value: "1", children: []}]}]}
				]
		});
	});
	test("invalid input", () => {
		expect(parser.parse("1zzz")).toEqual({type: "DIGITS", value: "1", children: []});
	});
	test("custom callback", () => {
		expect(parser.parse("2*(3+4)", test_calc_solver)).toBe(14);
	});
});

describe("test grammar input with callback", () => {
	const parser = new Parser(new Lexer(test_calc_language_with_solver.lex), test_calc_language_with_solver.grammar, new ParserGenerator(test_calc_language_with_solver).getParsingTable(), "grammar");
	test("custom callback in grammar", () => {
		expect(parser.parse("2*(3+4)")).toBe(14);
	});
});
