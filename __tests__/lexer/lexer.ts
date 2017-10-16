import {Lexer} from "../../src/lexer/lexer";
import {test_sample_lex, test_empty_grammar} from "../data/sample_grammar";
import {SYMBOL_EOF} from "../../src/def/token";

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
		const lexer = new Lexer(test_empty_grammar.lex);
		expect(() => {
			lexer.exec("xabc;x|&0ax x z;");
		}).toThrow(/no pattern matched/);
	});
	test("exec no length input", () => {
		const lexer = new Lexer(test_sample_lex);
		expect(lexer.exec("")).toEqual([
			{token: SYMBOL_EOF, value: ""}
		]);
		const lexer2 = new Lexer(test_empty_grammar.lex);
		expect(lexer2.exec("")).toEqual([
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("regexp flags", () => {
		const lexer = new Lexer([
			{token: "I", pattern: /AbC/i},
			{token: "M", pattern: /x\nyz/m},
			{token: "U", pattern: /\u{64}\u{65}\u{66}/u},
			{token: "G", pattern: /pqr/g},
			{token: "A", pattern: /\u{61}\nC/imugy}
		]);
		expect(lexer.exec("abcx\nyzdefpqra\nc")).toEqual([
			{token: "I", value: "abc"},
			{token: "M", value: "x\nyz"},
			{token: "U", value: "def"},
			{token: "G", value: "pqr"},
			{token: "A", value: "a\nc"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
});
