/// <reference path="../lexer/src/lexer.ts" />
/// <reference path="../typings/index.d.ts" />
module ParserGenerator{
	export interface SyntaxDefinitionSection{
		ltoken: string;
		pattern: Array<Array<string>>;
	}
	// ltokenは重複しないことを前提とする
	export type SyntaxDefinitions = Array<SyntaxDefinitionSection>;
	export var def:SyntaxDefinitions = [
		{
			ltoken: "EXP",
			pattern: [["EXP", "PLUS", "TERM"], ["TERM"]]
		},
		{
			ltoken: "TERM",
			pattern: [["TERM", "ASTERISK", "ATOM"], ["ATOM"]]
		},
		{
			ltoken: "ATOM",
			pattern:[["DIGITS"], ["LPAREN", "EXP", "RPAREN"]]
		}
	];
	export class TerminalSymbolDiscriminator{
		private terminal_symbols: Array<string>;
		private nonterminal_symbols: Array<string>;
		constructor(lexdef:Lexer.LexDefinitions, syntaxdef:SyntaxDefinitions){
			var symbol_table:Array<{symbol:string, is_terminal:boolean}> = [];
			// 字句規則からの登録
			for(var i=0; i<lexdef.length; i++){
				if(lexdef[i].type == null){
					continue;
				}
				// 重複がなければ登録する
				var flg_push = true;
				for(var ii=0; ii<symbol_table.length; ii++){
					if(symbol_table[ii].symbol == lexdef[i].type){
						flg_push = false;
						break;
					}
				}
				if(flg_push){
					// 終端記号として登録
					symbol_table.push({symbol: lexdef[i].type, is_terminal: true});
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
		getTerminalSymbols():Array<string>{
			return this.terminal_symbols.slice();
		}
		getNonterminalSymbols():Array<string>{
			return this.nonterminal_symbols.slice();
		}
		getAllSymbols():Array<string>{
			return this.terminal_symbols.concat(this.nonterminal_symbols);
		}
		// その都度生成するから呼び出し先で保持して
		// true: terminal, false: nonterminal
		getAllSymbolsMap():{[key:string]:boolean}{
			var result = {};
			for(var i=0; i<this.terminal_symbols.length; i++){
				result[this.terminal_symbols[i]] = true;
			}
			for(var i=0; i<this.nonterminal_symbols.length; i++){
				result[this.nonterminal_symbols[i]] = false;
			}
			return result;
		}
		isTerminalSymbol(symbol:string):boolean{
			for(var i=0; i<this.terminal_symbols.length; i++){
				if(this.terminal_symbols[i] == symbol) return true;
			}
			return false;
		}
		isNonterminalSymbol(symbol:string):boolean{
			for(var i=0; i<this.nonterminal_symbols.length; i++){
				if(this.nonterminal_symbols[i] == symbol) return true;
			}
			return false;
		}
	}
	type Constraint = Array<{superset:string, subset:string}>;
	export class ParserGenerator{
		private nulls:Array<string>;
		private first_table;
		private follow_table;
		constructor(private lexdef:Lexer.LexDefinitions, private syntaxdef:SyntaxDefinitions, private symbol_discriminator: TerminalSymbolDiscriminator){
			this.init();
		}
		init(){
			this.generateNulls();
			this.generateFIRST();
		}
		private isInNulls(x:string){
			for(var i=0; i<this.nulls.length; i++){
				if(this.nulls[i] == x) return true;
			}
			return false;
		}
		// nulls初期化
		private generateNulls(){
			// 制約条件を導出するために、
			// 空列になりうる記号の集合nullsを導出
			this.nulls = [];
			for(var i=0; i<this.syntaxdef.length; i++){
				var ltoken = this.syntaxdef[i].ltoken;
				var pattern = this.syntaxdef[i].pattern;
				for(var ii=0; ii<pattern.length; ii++){
					// 右辺の記号の数が0の規則を持つ記号は空列になりうる
					if(pattern[ii] == []){
						this.nulls.push(ltoken);
						break;
					}
				}
			}
			var flg_changed:boolean = true;
			// 変更が起きなくなるまでループする
			while(flg_changed){
				flg_changed = false;
				for(var i=0; i<this.syntaxdef.length; i++){
					var ltoken = this.syntaxdef[i].ltoken;

					// 既にnullsに含まれていればスキップ
					if(this.isInNulls(ltoken)) continue;

					var pattern = this.syntaxdef[i].pattern;
					for(var ii=0; ii<pattern.length; ii++){
						var flg_nulls = true;
						for(var iii=0; iii<pattern[ii].length; iii++){
							if(!this.isInNulls(pattern[ii][iii])){
								flg_nulls = false;
								break;
							}
						}
						if(flg_nulls){
							this.nulls.push(ltoken);
							flg_changed = true;
						}
					}
				}
			}
		}
		// 包含関係にあるかどうかの判定
		// supersetおよびsubsetはsortされていることを前提とする
		private isInclude(superset:Array<string>, subset:Array<string>): boolean{
			var index =0;
			var d = 0;
			while(index<subset.length){
				if(index+d >= superset.length){
					return false;
				}
				else if(subset[index] == superset[index+d]){
					index++;
				}
				else{
					d++;
				}
			}
			return true;
		}
		// 制約条件がすべて満たされたかどうかを判定する
		// 与えられたtable内の配列がソートされていることを前提とする
		private isConstraintFilled(constraint:Constraint, table:{[key:string]: Array<string>}): boolean{
			for(var i=0; i<constraint.length; i++){
				var superset = table[constraint[i].superset];
				var subset = table[constraint[i].subset];
				// tableのsubの要素がすべてsupに含まれていることを調べる
				if(!this.isInclude(superset,subset)){
					// subの要素がすべてsupに含まれていなかった
					return false;
				}
			}
			return true;
		}
		private generateFIRST(){
			// 包含についての制約を生成
			var constraint:Constraint = [];
			for(var i=0; i<this.syntaxdef.length; i++){
				var def = this.syntaxdef[i];
				for(var ii=0; ii<def.pattern.length; ii++){
					for(var iii=0; iii<def.pattern[ii].length; iii++){
						let symb = def.pattern[ii][iii];
						// supersetとsubsetが同じ場合は制約を追加しない
						if(def.ltoken != symb){
							constraint.push({superset: def.ltoken, subset: symb});
						}
						// 左側の記号がすべてnullsに含まれている限り制約を追加していく
						if(!this.isInNulls(symb)){
							break;
						}
					}
				}
			}
			console.log(constraint);

			//FIRSTを導出
			var first_result:{[key:string]: Array<string>} = {};
			// 初期化
			var terminal_symbols = this.symbol_discriminator.getTerminalSymbols();
			for(var i=0; i<terminal_symbols.length; i++){
				first_result[terminal_symbols[i]] = [terminal_symbols[i]];
			}
			var nonterminal_symbols = this.symbol_discriminator.getNonterminalSymbols();
			for(var i=0; i<nonterminal_symbols.length; i++){
				first_result[nonterminal_symbols[i]] = [];
			}

			// 制約解消
			while(!this.isConstraintFilled(constraint, first_result)){
				for(var i=0; i<constraint.length; i++){
					var sup = constraint[i].superset;
					var sub = constraint[i].subset;
					// 包含関係にあるべき2つの集合が包含関係にない
					if(!this.isInclude(first_result[sup], first_result[sub])){
						// subset内の要素をsupersetに入れていく
						var flg_changed = false;
						for(var ii=0; ii<first_result[sub].length; ii++){
							// 既に登録されている要素は登録しない
							var flg_duplicated = false;
							for(var iii=0; iii<first_result[sup].length; iii++){
								if(first_result[sub][ii] == first_result[sup][ii]){
									flg_duplicated = true;
									break;
								}
							}
							if(!flg_duplicated){
								first_result[sup].push(first_result[sub][ii]);
								flg_changed = true;
							}
						}
						// 要素の追加が行われた場合、supersetをsortしておく
						if(flg_changed){
							first_result[sup].sort();
						}
					}
				}
			}
			console.log("FIRST:",first_result);
			this.first_table = first_result;
		}
		private generateFOLLOW(){
			/*
			// 包含についての制約を生成
			var constraint:Constraint = [];
			for(var i=0; i<this.syntaxdef.length; i++){
				var def = this.syntaxdef[i];
				for(var ii=0; ii<def.pattern.length; ii++){
					for(var iii=0; iii<def.pattern[ii].length; iii++){
						let symb = def.pattern[ii][iii];
						// supersetとsubsetが同じ場合は制約を追加しない
						if(def.ltoken != symb){
							constraint.push({superset: def.ltoken, subset: symb});
						}
						// 左側の記号がすべてnullsに含まれている限り制約を追加していく
						if(!this.isInNulls(symb)){
							break;
						}
					}
				}
			}*/
		}
	}
}

