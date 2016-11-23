/// <reference path="../lexer/src/lexer.ts" />
/// <reference path="../typings/index.d.ts" />
/// <reference path="syntaxdef.ts" />
/// <reference path="terminalsymboldiscriminator.ts" />

module ParserGenerator{
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
			this.generateFOLLOW();
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
			var follow_result:{[key:string]: Array<string>} = {};
			var nonterminal_symbols = this.symbol_discriminator.getNonterminalSymbols();
			for(var i=0; i<nonterminal_symbols.length; i++){
				follow_result[nonterminal_symbols[i]] = [];
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
							for(var index = 0; index<this.first_table[sub].length; index++){
								pushWithoutDuplicate(this.first_table[sub][index], follow_result[sup]);
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
			for(var symb in follow_result){
				follow_result[symb].sort();
			}
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
					// 包含関係にあるべき2つの集合が包含関係にない
					if(!this.isInclude(follow_result[sup], follow_result[sub])){
						// subset内の要素をsupersetに入れていく
						var flg_changed = false;
						for(var ii=0; ii<follow_result[sub].length; ii++){
							// 既に登録されている要素は登録しない
							var flg_duplicated = false;
							for(var iii=0; iii<follow_result[sup].length; iii++){
								if(follow_result[sub][ii] == follow_result[sup][ii]){
									flg_duplicated = true;
									break;
								}
							}
							if(!flg_duplicated){
								follow_result[sup].push(follow_result[sub][ii]);
								flg_changed = true;
							}
						}
						// 要素の追加が行われた場合、supersetをsortしておく
						if(flg_changed){
							follow_result[sup].sort();
						}
					}
				}
			}
			console.log("FOLLOW:",follow_result);
			this.follow_table = follow_result;
		}
	}
}

