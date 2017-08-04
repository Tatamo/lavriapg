import {test_calc_syntax, test_sample_syntax} from "./data/sample_grammar";
import {SymbolDiscriminator} from "../src/parsergenerator/symboldiscriminator";
import {Token} from "../src/def/token";

describe("SymbolDiscriminator test", () => {
	describe("test sample grammar", () => {
		const symbols = new SymbolDiscriminator(test_sample_syntax);
		test("S is Nonterminal", () => {
			expect(symbols.isNonterminalSymbol("S")).toBeTruthy();
			expect(symbols.isTerminalSymbol("S")).toBeFalsy();
		});
		test("E is Nonterminal", () => {
			expect(symbols.isNonterminalSymbol("E")).toBeTruthy();
			expect(symbols.isTerminalSymbol("E")).toBeFalsy();
		});
		test("LIST is Nonterminal", () => {
			expect(symbols.isNonterminalSymbol("LIST")).toBeTruthy();
			expect(symbols.isTerminalSymbol("LIST")).toBeFalsy();
		});
		test("T is Nonterminal", () => {
			expect(symbols.isNonterminalSymbol("T")).toBeTruthy();
			expect(symbols.isTerminalSymbol("T")).toBeFalsy();
		});
		test("HOGE is Nonterminal", () => {
			expect(symbols.isNonterminalSymbol("HOGE")).toBeTruthy();
			expect(symbols.isTerminalSymbol("HOGE")).toBeFalsy();
		});
		test("SEMICOLON is Terminal", () => {
			expect(symbols.isNonterminalSymbol("SEMICOLON")).toBeFalsy();
			expect(symbols.isTerminalSymbol("SEMICOLON")).toBeTruthy();
		});
		test("SEPARATE is Terminal", () => {
			expect(symbols.isNonterminalSymbol("SEPARATE")).toBeFalsy();
			expect(symbols.isTerminalSymbol("SEPARATE")).toBeTruthy();
		});
		test("ATOM is Terminal", () => {
			expect(symbols.isNonterminalSymbol("ATOM")).toBeFalsy();
			expect(symbols.isTerminalSymbol("ATOM")).toBeTruthy();
		});
		test("ID is Terminal", () => {
			expect(symbols.isNonterminalSymbol("ID")).toBeFalsy();
			expect(symbols.isTerminalSymbol("ID")).toBeTruthy();
		});
		test("INVALID (not appear in syntax) is neither Nonterminal nor Terminal", () => {
			expect(symbols.isNonterminalSymbol("INVALID")).toBeFalsy();
			expect(symbols.isTerminalSymbol("INVALID")).toBeFalsy();
		});
		test("Check nonterminal symbols set", () => {
			const nt: Set<Token> = symbols.getNonterminalSymbols();
			const nt_set = new Set<Token>();
			nt_set.add("S");
			nt_set.add("E");
			nt_set.add("LIST");
			nt_set.add("T");
			nt_set.add("HOGE");
			expect(nt).toEqual(nt_set);
		});
		test("Check terminal symbols set", () => {
			const t: Set<Token> = symbols.getTerminalSymbols();
			const t_set = new Set<Token>();
			t_set.add("SEMICOLON");
			t_set.add("SEPARATE");
			t_set.add("ATOM");
			t_set.add("ID");
			expect(t).toEqual(t_set);
		});
	});
	describe("test sample grammar", () => {
		const symbols = new SymbolDiscriminator(test_calc_syntax);
		test("Check nonterminal symbols set", () => {
			const nt: Set<Token> = symbols.getNonterminalSymbols();
			const nt_set = new Set<Token>();
			nt_set.add("EXP");
			nt_set.add("TERM");
			nt_set.add("ATOM");
			expect(nt).toEqual(nt_set);
		});
		test("Check terminal symbols set", () => {
			const t: Set<Token> = symbols.getTerminalSymbols();
			const t_set = new Set<Token>();
			t_set.add("PLUS");
			t_set.add("ASTERISK");
			t_set.add("DIGITS");
			t_set.add("LPAREN");
			t_set.add("RPAREN");
			expect(t).toEqual(t_set);
		});
	});
});
