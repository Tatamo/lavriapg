import {test_dynamic_lexrules_language, test_lexstate_language} from "../data/sample_language";
import {SYMBOL_EOF} from "../../src/def/token";
import {Lexer} from "../../src/lexer/lexer";

describe("lex state test", () => {
	test("nested states", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("${$($123)$}")).toMatchSnapshot();
	});
	test("rule of non-default state", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("123")).not.toEqual([
			{token: "NUMBER", value: "123"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("reset state after process", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("{(")).toMatchSnapshot();
		expect(lexer.exec(")}")).toMatchSnapshot();
	});
	test("exclusive state", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("(+a{*)")).toMatchSnapshot();
	});
	test("non-exclusive state", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("${$+a*}")).toMatchSnapshot();
	});
});

describe("dynamic lex rules test", () => {
	test("adding and removing rules", () => {
		const lexer = new Lexer(test_dynamic_lexrules_language);
		expect(lexer.exec("%%{}%}%%}%%")).toMatchSnapshot();
	});
});
