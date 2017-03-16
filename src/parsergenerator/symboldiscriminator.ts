import {Token} from "../def/token";
import {SyntaxDefinitions} from "../def/grammar";

export class SymbolDiscriminator{
	private terminal_symbols: Set<Token>;
	private nonterminal_symbols: Set<Token>;
	constructor(syntaxdef:SyntaxDefinitions){
		this.terminal_symbols = new Set<Token>();
		this.nonterminal_symbols = new Set<Token>();

		// 左辺値の登録
		for(let sect of syntaxdef){
			let symbol = sect.ltoken;
			// 構文規則の左辺に現れる記号は非終端記号
			this.nonterminal_symbols.add(symbol);
		}
		// 右辺値の登録
		for(let sect of syntaxdef){
			for(let symbol of sect.pattern){
				if(!this.nonterminal_symbols.has(symbol)){
					// 非終端記号でない(=左辺値に現れない)場合、終端記号である
					this.terminal_symbols.add(symbol);
				}
			}
		}
	}
	public getTerminalSymbols():Set<Token>{
		return this.terminal_symbols;
	}
	public getNonterminalSymbols():Set<Token>{
		return this.nonterminal_symbols;
	}
	public isTerminalSymbol(symbol:Token):boolean{
		return this.terminal_symbols.has(symbol);
	}
	public isNonterminalSymbol(symbol:Token):boolean{
		return this.nonterminal_symbols.has(symbol);
	}
}
