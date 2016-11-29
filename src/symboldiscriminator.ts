/// <reference path="syntaxdef.ts" />
/// <reference path="../lexer/src/lexer.ts" />

module ParserGenerator{
	export class SymbolDiscriminator{
		private terminal_symbols: Array<Lexer.Token>;
		private nonterminal_symbols: Array<Lexer.Token>;
		constructor(lexdef:Lexer.LexDefinitions, syntaxdef:SyntaxDefinitions){
			var symbol_table:Array<{symbol:Lexer.Token, is_terminal:boolean}> = [];
			// 字句規則からの登録
			for(var i=0; i<lexdef.length; i++){
				if(lexdef[i].token == null){
					continue;
				}
				// 重複がなければ登録する
				var flg_push = true;
				for(var ii=0; ii<symbol_table.length; ii++){
					if(symbol_table[ii].symbol == lexdef[i].token){
						flg_push = false;
						break;
					}
				}
				if(flg_push){
					// 終端記号として登録
					symbol_table.push({symbol: lexdef[i].token, is_terminal: true});
				}
			}
			// 構文規則からの登録(左辺値のみ)
			for(var i=0; i<syntaxdef.length; i++){
				var flg_token_not_found = true;
				// 重複がなければ登録する
				for(var ii=0; ii<symbol_table.length; ii++){
					if(syntaxdef[i].ltoken == symbol_table[ii].symbol){
						// もし既に登録されていた場合、終端記号ではないとする
						symbol_table[ii].is_terminal = false;
						flg_token_not_found = false;
						break;
					}
				}
				if(flg_token_not_found){
					// 構文規則の左辺に現れる記号は非終端記号
					symbol_table.push({symbol : syntaxdef[i].ltoken, is_terminal : false});
				}
			}
			this.terminal_symbols = [];
			this.nonterminal_symbols = [];
			for(var i=0; i<symbol_table.length; i++){
				if(symbol_table[i].is_terminal){
					this.terminal_symbols.push(symbol_table[i].symbol);
				}
				else{
					this.nonterminal_symbols.push(symbol_table[i].symbol);
				}
			}
		}
		getTerminalSymbols():Array<Lexer.Token>{
			return this.terminal_symbols.slice();
		}
		getNonterminalSymbols():Array<Lexer.Token>{
			return this.nonterminal_symbols.slice();
		}
		getAllSymbols():Array<Lexer.Token>{
			return this.terminal_symbols.concat(this.nonterminal_symbols);
		}
		// その都度生成するから呼び出し先で保持して
		// true: terminal, false: nonterminal
		getAllSymbolsMap():Map<Lexer.Token, boolean>{
			var result = new Map();
			for(var i=0; i<this.terminal_symbols.length; i++){
				result.set(this.terminal_symbols[i], true);
			}
			for(var i=0; i<this.nonterminal_symbols.length; i++){
				result.set(this.nonterminal_symbols[i], false);
			}
			return result;
		}
		isTerminalSymbol(symbol:Lexer.Token):boolean{
			for(var i=0; i<this.terminal_symbols.length; i++){
				if(this.terminal_symbols[i] == symbol) return true;
			}
			return false;
		}
		isNonterminalSymbol(symbol:Lexer.Token):boolean{
			for(var i=0; i<this.nonterminal_symbols.length; i++){
				if(this.nonterminal_symbols[i] == symbol) return true;
			}
			return false;
		}
	}
}
