/// <reference path="../lexer/src/lexer.ts" />
/// <reference path="../typings/index.d.ts" />
/// <reference path="syntaxdef.ts" />
/// <reference path="symboldiscriminator.ts" />

module ParserGenerator{
	type Constraint = Array<{superset:Lexer.Token, subset:Lexer.Token}>;
	export class ParserGenerator{
		private nulls:Array<Lexer.Token>;
		private first_map: Map<Lexer.Token, Array<Lexer.Token>>;
		private follow_map: Map<Lexer.Token, Array<Lexer.Token>>;
		private symbol_discriminator: SymbolDiscriminator;
		constructor(private start_symbol, private syntaxdef:SyntaxDefinitions, lexdef: Lexer.LexDefinitions){
			// 字句規則にSymbol(EOF)を追加
			lexdef.push({token:Lexer.SYMBOL_EOF, pattern: ""});
			// 構文規則に S' -> S $ を追加
			this.syntaxdef.unshift( { ltoken: SYMBOL_SYNTAX, pattern: [[this.start_symbol, Lexer.SYMBOL_EOF]] } )
			this.symbol_discriminator = new SymbolDiscriminator(lexdef, syntaxdef);

			this.init();
		}
		init(){
			this.generateNulls();
			this.generateFIRST();
			this.generateFOLLOW();
		}
		private isInNulls(x:Lexer.Token){
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
		private isInclude(superset:Array<Lexer.Token>, subset:Array<Lexer.Token>): boolean{
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
		private isConstraintFilled(constraint:Constraint, table:Map<Lexer.Token, Array<Lexer.Token>>): boolean{
			for(var i=0; i<constraint.length; i++){
				var superset = table.get(constraint[i].superset);
				var subset = table.get(constraint[i].subset);
				// tableのsubの要素がすべてsupに含まれていることを調べる
				if(!this.isInclude(superset,subset)){
					// subの要素がすべてsupに含まれていなかった
					return false;
				}
			}
			return true;
		}
		private generateFIRST(){
			//FIRSTを導出
			//var first_result:{[key:string]: Array<string>} = {};
			var first_result: Map<Lexer.Token, Array<Lexer.Token>> = new Map();
			// 初期化
			var terminal_symbols = this.symbol_discriminator.getTerminalSymbols();
			for(var i=0; i<terminal_symbols.length; i++){
				first_result.set(terminal_symbols[i], [terminal_symbols[i]]);
			}
			var nonterminal_symbols = this.symbol_discriminator.getNonterminalSymbols();
			for(var i=0; i<nonterminal_symbols.length; i++){
				first_result.set(nonterminal_symbols[i], []);
			}

			// 包含についての制約を生成
			var constraint:Constraint = [];
			for(var i=0; i<this.syntaxdef.length; i++){
				var def = this.syntaxdef[i];
				var sup = def.ltoken;
				var pattern = def.pattern;
				for(var ii=0; ii<pattern.length; ii++){
					for(var iii=0; iii<pattern[ii].length; iii++){
						var sub = pattern[ii][iii];
						// supersetとsubsetが同じ場合は制約を追加しない
						if(sup != sub){
							constraint.push({superset: sup, subset: sub});
						}
						// 左側の記号がすべてnullsに含まれている限り制約を追加していく
						if(!this.isInNulls(sub)){
							break;
						}
					}
				}
			}
			console.log(constraint);

			// 制約解消
			while(!this.isConstraintFilled(constraint, first_result)){
				for(var i=0; i<constraint.length; i++){
					var sup = constraint[i].superset;
					var sub = constraint[i].subset;
					var superset = first_result.get(sup);
					var subset = first_result.get(sub);
					// 包含関係にあるべき2つの集合が包含関係にない
					if(!this.isInclude(superset, subset)){
						// subset内の要素をsupersetに入れていく
						var flg_changed = false;
						for(var ii=0; ii<subset.length; ii++){
							// 既に登録されている要素は登録しない
							var flg_duplicated = false;
							for(var iii=0; iii<superset.length; iii++){
								if(subset[ii] == superset[ii]){
									flg_duplicated = true;
									break;
								}
							}
							if(!flg_duplicated){
								superset.push(subset[ii]);
								flg_changed = true;
							}
						}
						// 要素の追加が行われた場合、supersetをsortしておく
						if(flg_changed){
							superset.sort();
						}
					}
				}
			}
			console.log("FIRST:",first_result);
			this.first_map = first_result;
		}
		private generateFOLLOW(){
			var pushWithoutDuplicate = (value:any, array:Array<any>, cmp:(x:any,y:any)=>boolean =(x,y)=>{return x == y;}):boolean=>{
				for(var i=0; i<array.length; i++){
					if(cmp(array[i], value)) {
						return false;
					}
				}
				array.push(value);
				return true;
			}
			// FOLLOWを導出
			// 初期化
			var follow_result:Map<Lexer.Token, Array<Lexer.Token>> = new Map();
			var nonterminal_symbols = this.symbol_discriminator.getNonterminalSymbols();
			for(var i=0; i<nonterminal_symbols.length; i++){
				follow_result.set(nonterminal_symbols[i], []);
			}

			for(var i=0; i<this.syntaxdef.length; i++){
				var ltoken = this.syntaxdef[i].ltoken;
				var pattern = this.syntaxdef[i].pattern;
				for(var ii=0; ii<pattern.length; ii++){
					// 一番右を除いてループ(べつにその必要はないが)
					for(var iii=0; iii<pattern[ii].length-1; iii++){
						var sup = pattern[ii][iii];
						if(this.symbol_discriminator.isTerminalSymbol(sup)){
							// 終端記号はFOLLOW(X)のXにはならない
							break;
						}
						for(var d=1; iii+d<pattern[ii].length; d++){
							var sub = pattern[ii][iii+d];
							// FOLLOW(sup)にFIRST(sub)を重複を許さずに追加
							for(var index = 0; index<this.first_map.get(sub).length; index++){
								pushWithoutDuplicate(this.first_map.get(sub)[index], follow_result.get(sup));
							}
							// 記号がnullsに含まれている限り、右隣の記号のFIRSTもFOLLOWに加える
							if(!this.isInNulls(sub)){
								// 記号がnullsに含まれていない場合はその記号までで終了
								break;
							}
						}
					}
				}
			}
			// ソートしておく
			/*
			for(let array of follow_result.values()){
				array.sort();
			}
			*/

			var sort_with_symbol = (x:Lexer.Token, y:Lexer.Token) =>{
				let symbols = [];
				return ((x:Lexer.Token, y:Lexer.Token) =>{
					if(typeof x == "string" && typeof y == "string"){
						if(x < y) return -1;
						else if(x > y) return 1;
						else return 0;
					}
					else if(typeof x == "string"){
						return -1;
					}
					else if(typeof y == "string"){
						return 1;
					}
					else {
						// x, yともにsymbol
						let i_x = -1, i_y = -1;
						for(let i=0; i<symbols.length; i++){
							if(symbols[i] == x) i_x = i;
							if(symbols[i] == y) i_y = i;
							if(i_x >= 0 && i_y >= 0) break;
						}
						// 両方とも登録されている場合は登録順に返す
						if(i_x >= 0 && i_y >= 0) return i_x - i_y;
						else if(i_x >= 0 && i_y < 0) {
							// xだけ見つかった
							symbols.push(y);
							return -1; // xのほうが小さい
						}
						else if(i_x < 0 && i_y >= 0) {
							// yだけ見つかった
							symbols.push(x);
							return 1; // yのほうが小さい
						}
						else {
							// 両方見つからなかった
							if(x == y) {
								symbols.push(x);
								return 0;
							}
							else {
								// xのほうを先に登録 -> xのほうが小さい
								symbols.push(x);
								symbols.push(y);
								return -1;
							}
						}
					}
				})(x,y);
			}

			// とりあえずiterableを使わずに実装(target=es5)
			follow_result.forEach((value,key,map)=>{value.sort(sort_with_symbol);});
			// 包含についての制約を生成
			var constraint:Constraint = [];
			for(var i=0; i<this.syntaxdef.length; i++){
				var def = this.syntaxdef[i];
				var sub = def.ltoken; // 左辺の記号はsubsetになる
				var pattern = def.pattern;
				for(var ii=0; ii<pattern.length; ii++){
					// 右端から左に見ていく
					for(var iii=pattern[ii].length-1; iii>=0; iii--){
						var sup = pattern[ii][iii];
						// supが終端記号ならスキップ(nullsに含まれていないことは自明なのでここでbreakする)
						if(this.symbol_discriminator.isTerminalSymbol(sup)){
							break;
						}
						// supersetとsubsetが同じ場合は制約を追加しない
						if(sup != sub){
							pushWithoutDuplicate({superset: sup, subset: sub}, constraint,
												 (x,y)=>{return x.superset == y.superset && x.subset == y.subset});
						}
						// 右側の記号がすべてnullsに含まれている限り制約を追加していく
						if(!this.isInNulls(sub)){
							break;
						}
					}
				}
			}

			// 制約解消
			while(!this.isConstraintFilled(constraint, follow_result)){
				for(var i=0; i<constraint.length; i++){
					var sup = constraint[i].superset;
					var sub = constraint[i].subset;
					var superset = follow_result.get(sup);
					var subset = follow_result.get(sub);
					// 包含関係にあるべき2つの集合が包含関係にない
					if(!this.isInclude(superset, subset)){
						// subset内の要素をsupersetに入れていく
						var flg_changed = false;
						for(var ii=0; ii<subset.length; ii++){
							// 既に登録されている要素は登録しない
							var flg_duplicated = false;
							for(var iii=0; iii<superset.length; iii++){
								if(subset[ii] == superset[ii]){
									flg_duplicated = true;
									break;
								}
							}
							if(!flg_duplicated){
								superset.push(subset[ii]);
								flg_changed = true;
							}
						}
						// 要素の追加が行われた場合、supersetをsortしておく
						if(flg_changed){
							superset.sort(sort_with_symbol);
						}
					}
				}
			}
			console.log("FOLLOW:",follow_result);
			this.follow_map = follow_result;
		}
	}
}

