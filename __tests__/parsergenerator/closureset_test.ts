import {GrammarDB} from "../../src/parsergenerator/grammardb";
import {test_empty_language, test_sample_language} from "../data/sample_language";
import {ClosureItem} from "../../src/parsergenerator/closureitem";
import {SYMBOL_EOF} from "../../src/def/token";
import {ClosureSet} from "../../src/parsergenerator/closureset";

describe("ClosureSet test", () => {
	describe("Closure{S' -> . S [$]}", () => {
		const grammardb = new GrammarDB(test_sample_language);
		const cs = new ClosureSet(grammardb, [new ClosureItem(grammardb, -1, 0, [SYMBOL_EOF])]);
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
			new ClosureItem(grammardb, -1, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 0, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 1, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 2, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 3, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(grammardb, 4, 0, ["SEPARATE", "SEMICOLON"]), // test changing lookaheads order
			new ClosureItem(grammardb, 5, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(grammardb, 6, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(grammardb, 7, 0, [SYMBOL_EOF])
		];
		const expanded_shuffled = [
			new ClosureItem(grammardb, 5, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(grammardb, 2, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 1, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 0, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 4, 0, ["SEPARATE", "SEMICOLON"]),
			new ClosureItem(grammardb, 7, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, -1, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 3, 0, ["SEMICOLON", "SEPARATE"]),
			new ClosureItem(grammardb, 6, 0, ["SEPARATE", "SEMICOLON"])
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
				expect(cs.isSameLR0(new ClosureSet(grammardb, expanded_shuffled))).toBeTruthy();
				expect(cs.isSameLR1(new ClosureSet(grammardb, expanded_shuffled))).toBeTruthy();
			});
		});
		test("ClosureSet#include", () => {
			for (const ci of expanded) {
				expect(cs.includes(ci)).toBeTruthy();
			}
		});
		test("ClosureSet#include invalid inputs", () => {
			expect(()=>cs.includes(new ClosureItem(grammardb, 0, 1, [SYMBOL_EOF]))).not.toThrow();
			expect(()=>cs.includes(new ClosureItem(grammardb, 0, 2, [SYMBOL_EOF]))).toThrow(/out of range/);
			expect(()=>cs.includes(new ClosureItem(grammardb, 0, -1, [SYMBOL_EOF]))).toThrow(/out of range/);
			expect(()=>cs.includes(new ClosureItem(grammardb, -2, 0, [SYMBOL_EOF]))).toThrow(/invalid grammar id/);
			expect(()=>cs.includes(new ClosureItem(grammardb, -8, 0, [SYMBOL_EOF]))).toThrow(/invalid grammar id/);
		});
		describe("invalid ClosureSet", () => {
			test("invalid grammar id", () => {
				expect(()=>new ClosureSet(grammardb, [new ClosureItem(grammardb, -2, 0, [SYMBOL_EOF])])).toThrow(/invalid grammar id/);
			});
			test("invalid dot position", () => {
				expect(()=>new ClosureSet(grammardb, [new ClosureItem(grammardb, 0, -1, [SYMBOL_EOF])])).toThrow(/out of range/);
			});
		});
	});
	describe("empty grammar", () => {
		const grammardb = new GrammarDB(test_empty_language);
		const cs = new ClosureSet(grammardb, [new ClosureItem(grammardb, -1, 0, [SYMBOL_EOF])]);
		const expanded = [
			new ClosureItem(grammardb, -1, 0, [SYMBOL_EOF]),
			new ClosureItem(grammardb, 0, 0, [SYMBOL_EOF])
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
