import {Lexer} from "../../src/lexer/lexer";
import {test_sample_lex, test_empty_language} from "../data/sample_language";
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
		const lexer = new Lexer(test_empty_language.lex);
		expect(() => {
			lexer.exec("xabc;x|&0ax x z;");
		}).toThrow(/no pattern matched/);
	});
	test("exec no length input", () => {
		const lexer = new Lexer(test_sample_lex);
		expect(lexer.exec("")).toEqual([
			{token: SYMBOL_EOF, value: ""}
		]);
		const lexer2 = new Lexer(test_empty_language.lex);
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
	test("skip string pattern if the following is \\w", () => {
		const lexer = new Lexer([
			{token: "STR", pattern: "abc"},
			{token: "REGEXP", pattern: /abc/},
			{token: "ASTERISK", pattern: "*"},
			{token: "XYZ", pattern: "xyz"}
		]);
		expect(lexer.exec("abcxyz*abc*xyz*abcabc")).toEqual([
			{token: "REGEXP", value: "abc"},
			{token: "XYZ", value: "xyz"},
			{token: "ASTERISK", value: "*"},
			{token: "STR", value: "abc"},
			{token: "ASTERISK", value: "*"},
			{token: "XYZ", value: "xyz"},
			{token: "ASTERISK", value: "*"},
			{token: "REGEXP", value: "abc"},
			{token: "STR", value: "abc"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("rule priority", () => {
		const lexer = new Lexer([
			{token: "PM", pattern: "+-"},
			{token: "PMA", pattern: "+-*"},
			{token: "ASTERISK", pattern: "*", priority: 1},
			{token: "ABC", pattern: /abc/},
			{token: "ABCD", pattern: /abcd/},
			{token: "ABCD2", pattern: /abcd/, priority: 2},
			{token: "D", pattern: /d/},
			{token: "XYZ", pattern: /xyz/},
			{token: "XYZW", pattern: /xyzw/, priority: -1},
			{token: "W", pattern: /w/},
			{token: null, pattern: " "}
		]);
		expect(lexer.exec(" +-+-*abcd xyzw")).toEqual([
			{token: "PM", value: "+-"},
			{token: "PMA", value: "+-*"},
			{token: "ABCD2", value: "abcd"},
			{token: "XYZ", value: "xyz"},
			{token: "W", value: "w"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("longest match", () => {
		const lexer = new Lexer([
			{token: "PM", pattern: "+-"},
			{token: "PMA", pattern: "+-*"},
			{token: "ASTERISK", pattern: "*"},
			{token: "ABC", pattern: /abc/},
			{token: "ABCD", pattern: /abcd/},
			{token: "ABCD2", pattern: /abcd/},
			{token: "D", pattern: /d/},
			{token: null, pattern: " "}
		]);
		expect(lexer.exec(" +-+-*abcd ")).toEqual([
			{token: "PM", value: "+-"},
			{token: "PMA", value: "+-*"},
			{token: "ABCD", value: "abcd"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("add rule and exec again after reset", () => {
		// TODO: このテストで規定される挙動は直観的でない可能性がある
		const lexer = new Lexer([
			{token: "ASTERISK", pattern: "*"},
			{token: "ABC", pattern: /abc/},
			{token: null, pattern: " "}
		]);
		lexer.add({token: "ABCAST", pattern: /abc\*/, priority: 1});
		expect(lexer.exec(" *abc* ")).toEqual([
			{token: "ASTERISK", value: "*"},
			{token: "ABCAST", value: "abc*"},
			{token: SYMBOL_EOF, value: ""}
		]);
		// reset add
		expect(lexer.exec(" *abc* ")).toEqual([
			{token: "ASTERISK", value: "*"},
			{token: "ABC", value: "abc"},
			{token: "ASTERISK", value: "*"},
			{token: SYMBOL_EOF, value: ""}
		]);
		lexer.add({token: "ABCAST", pattern: /abc\*/, priority: 1});
		lexer.setCurrentDefinitionAsDefault();
		expect(lexer.exec(" *abc* ")).toEqual([
			{token: "ASTERISK", value: "*"},
			{token: "ABCAST", value: "abc*"},
			{token: SYMBOL_EOF, value: ""}
		]);
		expect(lexer.exec(" *abc* ")).toEqual([
			{token: "ASTERISK", value: "*"},
			{token: "ABCAST", value: "abc*"},
			{token: SYMBOL_EOF, value: ""}
		]);
	});
	test("callback", () => {
		const lexer = new Lexer([
			{
				token: "ERROR", pattern: "x",
				callback: () => {
					throw new Error("custom callback");
				}
			},
			{token: null, pattern: " "}
		]);
		expect(() => lexer.exec(" x ")).toThrow(/custom callback/);
	});
});
