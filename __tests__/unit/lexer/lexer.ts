import {Lexer} from "../../../src/lexer/lexer";
import {test_sample_lex} from "../../data/sample_grammar";
import {SYMBOL_EOF} from "../../../src/def/token";
import {LexDefinitions} from "../../../src/def/grammar";

// INVALIDの項を削除したもの
export const test_sample_lex_without_invalid: LexDefinitions = [
	{token: "ATOM", pattern: "x"},
	{token: "ID", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/},
	{token: "SEMICOLON", pattern: ";"},
	{token: "SEPARATE", pattern: "|"},
	{token: null, pattern: /(\r\n|\r|\n)+/},
	{token: null, pattern: /[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/}
];

describe("Lexer test", () => {
	test("exec valid input", () => {
		const lexer = new Lexer(test_sample_lex);
		expect(lexer.exec("xabc;x|&0ax x z;")).toEqual([
			{token: "ID", value: "xabc"},
			{token: "SEMICOLON", value: ";"},
			{token: "ATOM", value: "x"},
			{token: "SEPARATE", value: "|"},
			{token: "INVALID", value: "&"},
			{token: "INVALID", value: "0"},
			{token: "ID", value: "ax"},
			{token: "ATOM", value: "x"},
			{token: "ID", value: "z"},
			{token: "SEMICOLON", value: ";"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("exec invalid input", () => {
		const lexer = new Lexer(test_sample_lex_without_invalid);
		expect(lexer.exec("xabc;x|&0ax x z;")).toThrow();
	});
	test("exec no length input", () => {
		const lexer = new Lexer(test_sample_lex);
		expect(lexer.exec("")).toEqual([
			{token: SYMBOL_EOF, value: ""}
		]);
	});
});
