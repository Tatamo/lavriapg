import {ClosureItem} from "../../src/parsergenerator/closureitem";
import {test_sample_language} from "../data/sample_language";
import {GrammarDB} from "../../src/index";
import {SYMBOL_EOF} from "../../src/def/token";

describe("ClosureItem test", () => {
	const grammardb = new GrammarDB(test_sample_language);
	describe("{S' -> . S [$]}", () => {
		const ci = new ClosureItem(grammardb, -1, 0, [SYMBOL_EOF]);
		test("getter", () => {
			expect(ci.rule_id).toBe(-1);
			expect(ci.dot_index).toBe(0);
			expect(ci.lookaheads).toEqual([SYMBOL_EOF]);
		});
		test("ClosureItem Hash", () => {
			const id_eof = grammardb.getTokenId(SYMBOL_EOF);
			expect(ci.getLR0Hash()).toBe("-1,0");
			expect(ci.getLR1Hash()).toBe(`-1,0,[${id_eof}]`);
		});
		describe("ClosureItem equality", () => {
			test("compare itself", () => {
				expect(ci.isSameLR0(ci)).toBeTruthy();
				expect(ci.isSameLR1(ci)).toBeTruthy();
			});
			test("same ClosureItem", () => {
				const ci2 = new ClosureItem(grammardb, -1, 0, [SYMBOL_EOF]);
				expect(ci.isSameLR0(ci2)).toBeTruthy();
				expect(ci.isSameLR1(ci2)).toBeTruthy();
			});
			test("not same ClosureItem", () => {
				const ci2 = new ClosureItem(grammardb, 0, 0, [SYMBOL_EOF]);
				expect(ci.isSameLR0(ci2)).toBeFalsy();
				expect(ci.isSameLR1(ci2)).toBeFalsy();
			});
			test("not same lookahead item", () => {
				const ci2 = new ClosureItem(grammardb, -1, 0, ["ID"]);
				expect(ci.isSameLR0(ci2)).toBeTruthy();
				expect(ci.isSameLR1(ci2)).toBeFalsy();
			});
		});
		test("invalid lookahead item", () => {
			expect(()=>new ClosureItem(grammardb, -1, 0, ["X"])).toThrow(/invalid token/);
		});
	});
	describe("invalid ClosureItem", () => {
		test("invalid grammar id", () => {
			expect(()=>new ClosureItem(grammardb, -2, 0, [SYMBOL_EOF])).toThrow();
		});
		test("invalid dot position", () => {
			expect(()=>new ClosureItem(grammardb, -1, -1, [SYMBOL_EOF])).toThrow();
		});
	});
});
