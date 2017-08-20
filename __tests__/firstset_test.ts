import {NullableSet} from "../src/parsergenerator/nullableset";
import {FirstSet} from "../src/parsergenerator/firstset";
import {test_sample_syntax} from "./data/sample_grammar";
import {SymbolDiscriminator} from "../src/parsergenerator/symboldiscriminator";

describe("FirstSet test", () => {
	const symbols: SymbolDiscriminator = new SymbolDiscriminator(test_sample_syntax);
	const first = new FirstSet(test_sample_syntax, symbols);
	describe("valid one terminal and nonterminal symbol", () => {
		test("First(S) is {SEMICOLON, SEPARATE, ATOM, ID}", () => {
			for (const symbol of ["SEMICOLON", "SEPARATE", "ATOM", "ID"]) {
				expect(first.get("S")).toContain(symbol);
			}
			expect(first.get("S").size).toBe(4);
		});
		test("First(E) is {SEMICOLON, SEPARATE, ATOM, ID}", () => {
			for (const symbol of ["SEMICOLON", "SEPARATE", "ATOM", "ID"]) {
				expect(first.get("E")).toContain(symbol);
			}
			expect(first.get("S").size).toBe(4);
		});
		test("First(LIST) is {SEPARATE, ATOM}", () => {
			for (const symbol of ["SEPARATE", "ATOM"]) {
				expect(first.get("LIST")).toContain(symbol);
			}
			expect(first.get("LIST").size).toBe(2);
		});
		test("First(T) is {ATOM}", () => {
			expect(first.get("T")).toContain("ATOM");
			expect(first.get("T").size).toBe(1);
		});
		test("First(HOGE) is {ID}", () => {
			expect(first.get("HOGE")).toContain("ID");
			expect(first.get("HOGE").size).toBe(1);
		});
		test("First(ID) is {ID}", () => {
			expect(first.get("ID")).toContain("ID");
			expect(first.get("ID").size).toBe(1);
		});
	});
	describe("valid word (multiple terminal or nonterminal symbols)", ()=> {
		test("First(LIST ID) is {SEPARATE ATOM ID}", () => {
			for (const symbol of ["SEPARATE", "ATOM", "ID"]) {
				expect(first.get(["LIST", "ID"])).toContain(symbol);
			}
			expect(first.get(["LIST", "ID"]).size).toBe(3);
		});
		test("First(HOGE HOGE) is {ID}", () => {
			expect(first.get(["HOGE", "HOGE"])).toContain("ID");
			expect(first.get(["HOGE", "HOGE"]).size).toBe(1);
		});
	});
	describe("invalid input (contains neither terminal nor nonterminal symbols)", ()=> {
		test("First(FOO) is {}", () => {
			expect(first.get("FOO").size).toBe(0);
		});
		test("First(INVALID) is {}", () => {
			expect(first.get("INVALID").size).toBe(0);
		});
		test("First(INVALID INVALID) is {}", () => {
			expect(first.get(["INVALID", "INVALID"])).toBe(0);
		});
		test("First(INVALID S) is {}", () => {
			expect(first.get(["INVALID", "S"])).toBe(0);
		});
		test("First(S) is {SEMICOLON, SEPARATE, ATOM, ID}", () => {
			// TODO: この挙動で正しいといえるのか？
			for (const symbol of ["SEMICOLON", "SEPARATE", "ATOM", "ID"]) {
				expect(first.get(["S", "INVALID"])).toContain(symbol);
			}
			expect(first.get(["S", "INVALID"]).size).toBe(4);
		});
	});
});
