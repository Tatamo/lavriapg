import {GrammarDefinition} from "../def/grammar";
import {Token} from "../def/token";

export class SymbolDiscriminator {
	private terminal_symbols: Set<Token>;
	private nonterminal_symbols: Set<Token>;
	constructor(syntaxdef: GrammarDefinition) {
		this.terminal_symbols = new Set<Token>();
		this.nonterminal_symbols = new Set<Token>();

		// 左辺値の登録
		for (const sect of syntaxdef) {
			const symbol = sect.ltoken;
			// 構文規則の左辺に現れる記号は非終端記号
			this.nonterminal_symbols.add(symbol);
		}
		// 右辺値の登録
		for (const sect of syntaxdef) {
			for (const symbol of sect.pattern) {
				if (!this.nonterminal_symbols.has(symbol)) {
					// 非終端記号でない(=左辺値に現れない)場合、終端記号である
					this.terminal_symbols.add(symbol);
				}
			}
		}
	}
	public getTerminalSymbols(): Set<Token> {
		// コピーを返す
		return new Set(this.terminal_symbols);
	}
	public getNonterminalSymbols(): Set<Token> {
		// コピーを返す
		return new Set(this.nonterminal_symbols);
	}
	public isTerminalSymbol(symbol: Token): boolean {
		return this.terminal_symbols.has(symbol);
	}
	public isNonterminalSymbol(symbol: Token): boolean {
		return this.nonterminal_symbols.has(symbol);
	}
}
