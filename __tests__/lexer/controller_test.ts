import {test_dynamic_lexrules_language, test_lexstate_language} from "../data/sample_language";
import {SYMBOL_EOF} from "../../src/def/token";
import {Lexer} from "../../src/lexer/lexer";

describe("lex state test", () => {
	test("nested states", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("${$($123)$}")).toEqual([
			{token: "INVALID", value: "$"},
			{token: "LBRACE", value: "{"},
			{token: "DOLLAR", value: "$"},
			{token: "LPAREN", value: "("},
			{token: "INVALID", value: "$"},
			{token: "NUMBER", value: "123"},
			{token: "RPAREN", value: ")"},
			{token: "DOLLAR", value: "$"},
			{token: "RBRACE", value: "}"},
			{token: SYMBOL_EOF, value: ""}
		]);
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
		expect(lexer.exec("{(")).toEqual([
			{token: "LBRACE", value: "{"},
			{token: "LPAREN", value: "("},
			{token: SYMBOL_EOF, value: ""}
		]);
		expect(lexer.exec(")}")).toEqual([
			{token: "INVALID", value: ")"},
			{token: "INVALID", value: "}"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("exclusive state", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("(+a{*)")).toEqual([
			{token: "LPAREN", value: "("},
			{token: "PLUS", value: "+"},
			{token: "INVALID", value: "a"},
			{token: "INVALID", value: "{"},
			{token: "ASTERISK", value: "*"},
			{token: "RPAREN", value: ")"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("non-exclusive state", () => {
		const lexer = new Lexer(test_lexstate_language);
		expect(lexer.exec("${$+a*}")).toEqual([
			{token: "INVALID", value: "$"},
			{token: "LBRACE", value: "{"},
			{token: "DOLLAR", value: "$"},
			{token: "PLUS", value: "+"},
			{token: "ID", value: "a"},
			{token: "INVALID", value: "*"},
			{token: "RBRACE", value: "}"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
});

describe("dynamic lex rules test", () => {
	test("adding and removing rules", () => {
		const lexer = new Lexer(test_dynamic_lexrules_language);
		expect(lexer.exec("%%{}%}%%}%%")).toEqual([
			{token: "LNEST", value: "%%{"},
			{token: "INVALID", value: "}"},
			{token: "INVALID", value: "%"},
			{token: "RNEST", value: "}%%"},
			{token: "INVALID", value: "}"},
			{token: "INVALID", value: "%"},
			{token: "INVALID", value: "%"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
});
