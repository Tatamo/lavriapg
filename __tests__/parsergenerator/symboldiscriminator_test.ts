import {test_calc_syntax, test_empty_grammar, test_sample_syntax} from "../data/sample_grammar";
import {SymbolDiscriminator} from "../../src/parsergenerator/symboldiscriminator";
import {Token} from "../../src/def/token";

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
			for (const symbol of ["S", "E", "LIST", "T", "HOGE"]) {
				expect(nt).toContain(symbol);
			}
			expect(nt.size).toBe(5);
		});
		test("Check terminal symbols set", () => {
			const t: Set<Token> = symbols.getTerminalSymbols();
			for (const symbol of ["SEMICOLON", "SEPARATE", "ATOM", "ID"]) {
				expect(t).toContain(symbol);
			}
			expect(t.size).toBe(4);
		});
	});
	describe("test sample grammar", () => {
		const symbols = new SymbolDiscriminator(test_calc_syntax);
		test("Check nonterminal symbols set", () => {
			const nt: Set<Token> = symbols.getNonterminalSymbols();
			for (const symbol of ["EXP", "TERM", "ATOM"]) {
				expect(nt).toContain(symbol);
			}
			expect(nt.size).toBe(3);
		});
		test("Check terminal symbols set", () => {
			const t: Set<Token> = symbols.getTerminalSymbols();
			for (const symbol of ["PLUS", "ASTERISK", "DIGITS", "LPAREN", "RPAREN"]) {
				expect(t).toContain(symbol);
			}
			expect(t.size).toBe(5);
		});
	});
	describe("test empty grammar", () => {
		const symbols = new SymbolDiscriminator(test_empty_grammar.syntax);
		test("Check nonterminal symbols set", () => {
			const nt: Set<Token> = symbols.getNonterminalSymbols();
			expect(nt).toContain("S");
			expect(nt.size).toBe(1);
		});
		test("Check terminal symbols set", () => {
			const t: Set<Token> = symbols.getTerminalSymbols();
			expect(t.size).toBe(0);
		});
	});
});
