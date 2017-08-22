import {SyntaxDB} from "../src/parsergenerator/syntaxdb";
import {test_empty_grammar, test_sample_grammar} from "./data/sample_grammar";
import {ClosureItem} from "../src/parsergenerator/closureitem";
import {SYMBOL_EOF} from "../src/def/token";
import {ClosureSet} from "../src/parsergenerator/closureset";

describe("ClosureSet test", () => {
	describe("Closure{S' -> . S [$]}", () => {
		const syntaxdb = new SyntaxDB(test_sample_grammar);
		const cs = new ClosureSet(syntaxdb, [new ClosureItem(syntaxdb, -1, 0, [SYMBOL_EOF])]);
		/*
		S' -> . S [$]
		S -> . E [$]
		E -> . LIST SEMICOLON [$]
		E -> . HOGE [$]
		LIST -> . T [SEMICOLON SEPARATE]
		LIST > . LIST SEPARATE T [SEMICOLON SEPARATE]
		T -> . ATOM [SEMICOLON SEPARATE]
		T -> . [SEMICOLON SEPARATE]
		HOGE -> . ID [$]
		 */
		const expanded = [
			new ClosureItem(syntaxdb, -1, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 0, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 1, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 2, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 3, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(syntaxdb, 4, 0, ["SEPARATE", "SEMICOLON"]), // test changing lookaheads order
			new ClosureItem(syntaxdb, 5, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(syntaxdb, 6, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(syntaxdb, 7, 0, [SYMBOL_EOF])
		];
		const expanded_shuffled = [
			new ClosureItem(syntaxdb, 5, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(syntaxdb, 2, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 1, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 0, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 4, 0, ["SEPARATE", "SEMICOLON"]),
			new ClosureItem(syntaxdb, 7, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, -1, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 3, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(syntaxdb, 6, 0, ["SEPARATE", "SEMICOLON"])
		];
		test("ClosureSet size", () => {
			expect(cs.size).toBe(9);
		});
		test("ClosureSet array", () => {
			expect(cs.getArray()).toEqual(expect.arrayContaining(expanded));
		});
		describe("ClosureSet equality", () => {
			test("compare itself", () => {
				expect(cs.isSameLR0(cs)).toBeTruthy();
				expect(cs.isSameLR1(cs)).toBeTruthy();
			});
			test("compare closureset that is given expanded items to constructor", () => {
				expect(cs.isSameLR0(new ClosureSet(syntaxdb, expanded_shuffled))).toBeTruthy();
				expect(cs.isSameLR1(new ClosureSet(syntaxdb, expanded_shuffled))).toBeTruthy();
			});
		});
		test("ClosureSet#include", () => {
			for (const ci of expanded) {
				expect(cs.includes(ci)).toBeTruthy();
			}
		});
		test("ClosureSet#include invalid inputs", () => {
			expect(()=>cs.includes(new ClosureItem(syntaxdb, 0, 1, [SYMBOL_EOF]))).not.toThrow();
			expect(()=>cs.includes(new ClosureItem(syntaxdb, 0, 2, [SYMBOL_EOF]))).toThrow(/out of range/);
			expect(()=>cs.includes(new ClosureItem(syntaxdb, 0, -1, [SYMBOL_EOF]))).toThrow(/out of range/);
			expect(()=>cs.includes(new ClosureItem(syntaxdb, -2, 0, [SYMBOL_EOF]))).toThrow(/invalid syntax id/);
			expect(()=>cs.includes(new ClosureItem(syntaxdb, -8, 0, [SYMBOL_EOF]))).toThrow(/invalid syntax id/);
		});
		describe("invalid ClosureSet", () => {
			test("invalid syntax id", () => {
				expect(()=>new ClosureSet(syntaxdb, [new ClosureItem(syntaxdb, -2, 0, [SYMBOL_EOF])])).toThrow(/invalid syntax id/);
			});
			test("invalid dot position", () => {
				expect(()=>new ClosureSet(syntaxdb, [new ClosureItem(syntaxdb, 0, -1, [SYMBOL_EOF])])).toThrow(/out of range/);
			});
		});
	});
	describe("empty syntax", () => {
		const syntaxdb = new SyntaxDB(test_empty_grammar);
		const cs = new ClosureSet(syntaxdb, [new ClosureItem(syntaxdb, -1, 0, [SYMBOL_EOF])]);
		const expanded = [
			new ClosureItem(syntaxdb, -1, 0, [SYMBOL_EOF]),
			new ClosureItem(syntaxdb, 0, 0, [SYMBOL_EOF])
		];
		test("ClosureSet size", () => {
			expect(cs.size).toBe(2);
		});
		test("ClosureSet array", () => {
			expect(cs.getArray()).toEqual(expect.arrayContaining(expanded));
		});
		test("ClosureSet#include", () => {
			for (const ci of expanded) {
				expect(cs.includes(ci)).toBeTruthy();
			}
		});
	});
});
