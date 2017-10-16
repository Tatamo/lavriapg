import {ClosureItem} from "../../src/parsergenerator/closureitem";
import {test_sample_grammar} from "../data/sample_grammar";
import {SyntaxDB} from "../../src/index";
import {SYMBOL_EOF} from "../../src/def/token";

describe("ClosureItem test", () => {
	const syntaxdb = new SyntaxDB(test_sample_grammar);
	describe("{S' -> . S [$]}", () => {
		const ci = new ClosureItem(syntaxdb, -1, 0, [SYMBOL_EOF]);
		test("getter", () => {
			expect(ci.syntax_id).toBe(-1);
			expect(ci.dot_index).toBe(0);
			expect(ci.lookaheads).toEqual([SYMBOL_EOF]);
		});
		test("ClosureItem Hash", () => {
			const id_eof = syntaxdb.getTokenId(SYMBOL_EOF);
			expect(ci.getLR0Hash()).toBe("-1,0");
			expect(ci.getLR1Hash()).toBe(`-1,0,[${id_eof}]`);
		});
		describe("ClosureItem equality", () => {
			test("compare itself", () => {
				expect(ci.isSameLR0(ci)).toBeTruthy();
				expect(ci.isSameLR1(ci)).toBeTruthy();
			});
			test("same ClosureItem", () => {
				const ci2 = new ClosureItem(syntaxdb, -1, 0, [SYMBOL_EOF]);
				expect(ci.isSameLR0(ci2)).toBeTruthy();
				expect(ci.isSameLR1(ci2)).toBeTruthy();
			});
			test("not same ClosureItem", () => {
				const ci2 = new ClosureItem(syntaxdb, 0, 0, [SYMBOL_EOF]);
				expect(ci.isSameLR0(ci2)).toBeFalsy();
				expect(ci.isSameLR1(ci2)).toBeFalsy();
			});
			test("not same lookahead item", () => {
				const ci2 = new ClosureItem(syntaxdb, -1, 0, ["ID"]);
				expect(ci.isSameLR0(ci2)).toBeTruthy();
				expect(ci.isSameLR1(ci2)).toBeFalsy();
			});
		});
		test("invalid lookahead item", () => {
			expect(()=>new ClosureItem(syntaxdb, -1, 0, ["X"])).toThrow(/invalid token/);
		});
	});
	describe("invalid ClosureItem", () => {
		test("invalid syntax id", () => {
			expect(()=>new ClosureItem(syntaxdb, -2, 0, [SYMBOL_EOF])).toThrow();
		});
		test("invalid dot position", () => {
			expect(()=>new ClosureItem(syntaxdb, -1, -1, [SYMBOL_EOF])).toThrow();
		});
	});
});
