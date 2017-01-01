import {Token} from "./token";
import {SyntaxDefinitions} from "./grammar";
import * as Immutable from "immutable";

export class SymbolDiscriminator{
	private terminal_symbols: Immutable.OrderedSet<Token>;
	private nonterminal_symbols: Immutable.OrderedSet<Token>;
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
		this.terminal_symbols = Immutable.OrderedSet<Token>();
		this.nonterminal_symbols = Immutable.OrderedSet<Token>();
		for(let i=0; i<symbol_table.length; i++){
			if(symbol_table[i].is_terminal){
				this.terminal_symbols = this.terminal_symbols.add(symbol_table[i].symbol);
			}
			else{
				this.nonterminal_symbols =  this.nonterminal_symbols.add(symbol_table[i].symbol);
			}
		}
	}
	getTerminalSymbols():Immutable.OrderedSet<Token>{
		return this.terminal_symbols;
	}
	getNonterminalSymbols():Immutable.OrderedSet<Token>{
		return this.nonterminal_symbols;
	}
	getAllSymbols():Immutable.OrderedSet<Token>{
		return this.terminal_symbols.union(this.nonterminal_symbols);
	}
	isTerminalSymbol(symbol:Token):boolean{
		return this.terminal_symbols.includes(symbol);
	}
	isNonterminalSymbol(symbol:Token):boolean{
		return this.nonterminal_symbols.includes(symbol);
	}
}
