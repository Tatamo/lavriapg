import {Token} from "../def/token";
import {SyntaxDefinitions} from "../def/grammar";

export class SymbolDiscriminator{
	private terminal_symbols: Set<Token>;
	private nonterminal_symbols: Set<Token>;
	constructor(syntaxdef:SyntaxDefinitions){
		let symbol_table:Array<{symbol:Token, is_terminal:boolean}> = [];

		// 左辺値の登録
		syntaxdef.forEach((sect)=>{
			let symbol = sect.ltoken;
			let flg_token_not_found = true;
			// 重複がなければ登録する
			for(let i=0; i<symbol_table.length; i++){
				if(symbol == symbol_table[i].symbol){
					// 既に登録されていた
					flg_token_not_found = false;
					break;
				}
			}
			if(flg_token_not_found){
				// 構文規則の左辺に現れる記号は非終端記号
				symbol_table.push({symbol: symbol, is_terminal: false});
			}
		});
		// 右辺値の登録
		syntaxdef.forEach((sect)=>{
			sect.pattern.forEach((symbol)=>{
				let flg_token_not_found = true;
				// 重複がなければ登録する
				for(let i=0; i<symbol_table.length; i++){
					if(symbol == symbol_table[i].symbol){
						flg_token_not_found = false;
						break;
					}
				}
				if(flg_token_not_found){
					// 未登録(=左辺値に現れない)場合、終端記号である
					symbol_table.push({symbol: symbol, is_terminal: true});
				}
			});
		});
		this.terminal_symbols = new Set<Token>();
		this.nonterminal_symbols = new Set<Token>();
		for(let i=0; i<symbol_table.length; i++){
			if(symbol_table[i].is_terminal){
				this.terminal_symbols.add(symbol_table[i].symbol);
			}
			else{
				this.nonterminal_symbols.add(symbol_table[i].symbol);
			}
		}
	}
	getTerminalSymbols():Set<Token>{
		return this.terminal_symbols;
	}
	getNonterminalSymbols():Set<Token>{
		return this.nonterminal_symbols;
	}
	isTerminalSymbol(symbol:Token):boolean{
		return this.terminal_symbols.has(symbol);
	}
	isNonterminalSymbol(symbol:Token):boolean{
		return this.nonterminal_symbols.has(symbol);
	}
}
