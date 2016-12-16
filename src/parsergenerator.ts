import * as Lexer from "lexer";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {SYMBOL_SYNTAX, SYMBOL_DOT, SyntaxDefinitionSection, SyntaxDefinitions} from "./syntaxdef";

import * as Immutable from "immutable";

export module ParserGenerator{
	type Constraint = Array<{superset:Lexer.Token, subset:Lexer.Token}>;
	type ClosureItem = {ltoken: Lexer.Token, pattern: Array<Lexer.Token>, lookahead: Lexer.Token};
	type ImmutableClosureItem = Immutable.Map<string,Lexer.Token | Immutable.Seq<number, Lexer.Token>>;
	type ClosureSet = Immutable.OrderedSet<ClosureItem>;
	type ImmutableClosureSet = Immutable.OrderedSet<ImmutableClosureItem>;
	type DFAEdge = Immutable.Map<Lexer.Token, number>;
	type DFANode = {closure: ClosureSet, edge: DFAEdge};
	type ImmutableDFANode = Immutable.Map<string, ImmutableClosureSet|DFAEdge>;
	export class ParserGenerator{
		private nulls:Immutable.Set<Lexer.Token>;
		private first_map: Immutable.Map<Lexer.Token, Immutable.Set<Lexer.Token>>;
		private follow_map: Immutable.Map<Lexer.Token, Immutable.Set<Lexer.Token>>;
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
			this.generateFirst();
			//this.generateGOTOGraph();
			this.generateDFA();
		}
		private isNullable(x:Lexer.Token){
			return this.nulls.includes(x);
		}
		// nulls初期化
		private generateNulls(){
			// 制約条件を導出するために、
			// 空列になりうる記号の集合nullsを導出
			this.nulls = Immutable.Set<Lexer.Token>();
			for(let i=0; i<this.syntaxdef.length; i++){
				let ltoken = this.syntaxdef[i].ltoken;
				let pattern = this.syntaxdef[i].pattern;
				for(let ii=0; ii<pattern.length; ii++){
					// 右辺の記号の数が0の規則を持つ記号は空列になりうる
					if(pattern[ii] == []){
						this.nulls.add(ltoken);
						break;
					}
				}
			}
			let flg_changed:boolean = true;
			// 変更が起きなくなるまでループする
			while(flg_changed){
				flg_changed = false;
				for(let i=0; i<this.syntaxdef.length; i++){
					let ltoken = this.syntaxdef[i].ltoken;

					// 既にnullsに含まれていればスキップ
					if(this.isNullable(ltoken)) continue;

					let pattern = this.syntaxdef[i].pattern;
					for(let ii=0; ii<pattern.length; ii++){
						let flg_nulls = true;
						for(let iii=0; iii<pattern[ii].length; iii++){
							if(!this.isNullable(pattern[ii][iii])){
								flg_nulls = false;
								break;
							}
						}
						if(flg_nulls){
							this.nulls.add(ltoken);
							flg_changed = true;
						}
					}
				}
			}
		}
		// 制約条件がすべて満たされたかどうかを判定する
		// 与えられたtable内の配列がソートされていることを前提とする
		private isConstraintFilled(constraint:Constraint, table:Immutable.Map<Lexer.Token, Immutable.Set<Lexer.Token>>): boolean{
			for(let i=0; i<constraint.length; i++){
				let superset = table.get(constraint[i].superset);
				let subset = table.get(constraint[i].subset);
				// tableのsubの要素がすべてsupに含まれていることを調べる
				if(!superset.isSuperset(subset)){
					// subの要素がすべてsupに含まれていなかった
					return false;
				}
			}
			return true;
		}
		private generateFirst(){
			//Firstを導出
			let first_result: Immutable.Map<Lexer.Token, Immutable.Set<Lexer.Token>> = Immutable.Map<Lexer.Token, Immutable.Set<Lexer.Token>>();
			// 初期化
			let terminal_symbols = this.symbol_discriminator.getTerminalSymbols();
			terminal_symbols.forEach((value)=>{
				first_result = first_result.set(value, Immutable.Set<Lexer.Token>([value]));
			});
			let nonterminal_symbols = this.symbol_discriminator.getNonterminalSymbols();
			nonterminal_symbols.forEach((value)=>{
				first_result = first_result.set(value, Immutable.Set<Lexer.Token>());
			});

			// 包含についての制約を生成
			let constraint:Constraint = [];
			for(let i=0; i<this.syntaxdef.length; i++){
				let def = this.syntaxdef[i];
				let sup = def.ltoken;
				let pattern = def.pattern;
				for(let ii=0; ii<pattern.length; ii++){
					for(let iii=0; iii<pattern[ii].length; iii++){
						let sub = pattern[ii][iii];
						// supersetとsubsetが同じ場合は制約を追加しない
						if(sup != sub){
							constraint.push({superset: sup, subset: sub});
						}
						// 左側の記号がすべてnullsに含まれている限り制約を追加していく
						if(!this.isNullable(sub)){
							break;
						}
					}
				}
			}
			console.log("constraint",constraint);

			// 制約解消
			while(!this.isConstraintFilled(constraint, first_result)){
				for(let i=0; i<constraint.length; i++){
					let sup = constraint[i].superset;
					let sub = constraint[i].subset;
					let superset = first_result.get(sup);
					let subset = first_result.get(sub);
					// 包含関係にあるべき2つの集合が包含関係にない
					if(!superset.isSuperset(subset)){
						// subset内の要素をsupersetに入れる
						superset = superset.union(subset);
						first_result = first_result.set(sup, superset);
					}
				}
			}
			console.log("First:",first_result);
			this.first_map = first_result;
		}
		/*
		private generateFollow(){
			let pushWithoutDuplicate = (value:any, array:Array<any>, cmp:(x:any,y:any)=>boolean =(x,y)=>{return x == y;}):boolean=>{
				for(let i=0; i<array.length; i++){
					if(cmp(array[i], value)) {
						return false;
					}
				}
				array.push(value);
				return true;
			}
			// Followを導出
			// 初期化
			let follow_result:Map<Lexer.Token, Array<Lexer.Token>> = new Map();
			let nonterminal_symbols = this.symbol_discriminator.getNonterminalSymbols();
			for(let i=0; i<nonterminal_symbols.length; i++){
				follow_result.set(nonterminal_symbols[i], []);
			}

			for(let i=0; i<this.syntaxdef.length; i++){
				let ltoken = this.syntaxdef[i].ltoken;
				let pattern = this.syntaxdef[i].pattern;
				for(let ii=0; ii<pattern.length; ii++){
					// 一番右を除いてループ(べつにその必要はないが)
					for(let iii=0; iii<pattern[ii].length-1; iii++){
						let sup = pattern[ii][iii];
						if(this.symbol_discriminator.isTerminalSymbol(sup)){
							// 終端記号はFollow(X)のXにはならない
							break;
						}
						for(let d=1; iii+d<pattern[ii].length; d++){
							let sub = pattern[ii][iii+d];
							// Follow(sup)にFirst(sub)を重複を許さずに追加
							for(let index = 0; index<this.first_map.get(sub).length; index++){
								pushWithoutDuplicate(this.first_map.get(sub)[index], follow_result.get(sup));
							}
							// 記号がnullsに含まれている限り、右隣の記号のFirstもFollowに加える
							if(!this.isNullable(sub)){
								// 記号がnullsに含まれていない場合はその記号までで終了
								break;
							}
						}
					}
				}
			}

			let sort_with_symbol = (x:Lexer.Token, y:Lexer.Token) =>{
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
			let constraint:Constraint = [];
			for(let i=0; i<this.syntaxdef.length; i++){
				let def = this.syntaxdef[i];
				let sub = def.ltoken; // 左辺の記号はsubsetになる
				let pattern = def.pattern;
				for(let ii=0; ii<pattern.length; ii++){
					// 右端から左に見ていく
					for(let iii=pattern[ii].length-1; iii>=0; iii--){
						let sup = pattern[ii][iii];
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
						if(!this.isNullable(sub)){
							break;
						}
					}
				}
			}

			// 制約解消
			while(!this.isConstraintFilled(constraint, follow_result)){
				for(let i=0; i<constraint.length; i++){
					let sup = constraint[i].superset;
					let sub = constraint[i].subset;
					let superset = follow_result.get(sup);
					let subset = follow_result.get(sub);
					// 包含関係にあるべき2つの集合が包含関係にない
					if(!this.isInclude(superset, subset)){
						// subset内の要素をsupersetに入れていく
						let flg_changed = false;
						for(let ii=0; ii<subset.length; ii++){
							// 既に登録されている要素は登録しない
							let flg_duplicated = false;
							for(let iii=0; iii<superset.length; iii++){
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
			console.log("Follow:",follow_result);
			this.follow_map = follow_result;
		}*/
		// 記号または記号列を与えて、その記号から最初に導かれうる非終端記号の集合を返す
		private getFirst(arg: Lexer.Token);
		private getFirst(arg: Array<Lexer.Token>);
		private getFirst(arg: Lexer.Token|Array<Lexer.Token>): Immutable.Set<Lexer.Token>{
			if(!Array.isArray(arg)){
				return this.first_map.get(arg);
			}
			let w: Array<Lexer.Token> = arg;

			let result: Immutable.Set<Lexer.Token> = Immutable.Set<Lexer.Token>();
			for(let i=0; i<w.length; i++){
				let add = this.first_map.get(w[i]); // i文字目のFirst集合を取得
				result = result.union(add); // 追加
				if(!this.isNullable(w[i])){
					// w[i] ∉ Nulls ならばここでストップ
					break;
				}
			}
			return result;
		}
		private convertClosureItem2Immutable(item: ClosureItem):ImmutableClosureItem{
			return Immutable.Map({ltoken: item.ltoken, pattern: Immutable.Seq<Lexer.Token>(item.pattern), lookahead: item.lookahead});
		}
		private convertImmutableClosureItem2Object(item_im: ImmutableClosureItem):ClosureItem{
			return {ltoken: <Lexer.Token>item_im.get("ltoken"), pattern: (<Immutable.Seq<number, Lexer.Token>>item_im.get("pattern")).toArray(), lookahead: <Lexer.Token>item_im.get("lookahead")};
		}
		private convertClosureSet2Immutable(closure: ClosureSet):ImmutableClosureSet{
			return closure.map((item)=>{return this.convertClosureItem2Immutable(item);}).toOrderedSet();
		}
		private convertImmutableClosureSet2Object(closure_im: ImmutableClosureSet):ClosureSet{
			return closure_im.map((item_im)=>{return this.convertImmutableClosureItem2Object(item_im);}).toOrderedSet();
		}
		// クロージャー展開を行う
		private expandClosure(start: Immutable.OrderedSet<ClosureItem>): Immutable.OrderedSet<ClosureItem>{
			// 非終端記号xに対し、それが左辺として対応する定義を返す
			let findDef = (x:Lexer.Token):SyntaxDefinitionSection =>{
				for(let i=0; i<this.syntaxdef.length; i++){
					if(this.syntaxdef[i].ltoken == x){
						return this.syntaxdef[i];
					}
				}
				return null;
			};
			let tmp:Immutable.OrderedSet<ImmutableClosureItem> = Immutable.OrderedSet<ImmutableClosureItem>();
			start.forEach((v)=>{
				tmp = tmp.add(this.convertClosureItem2Immutable(v));
			});
			let prev = null;
			// 変更がなくなるまで繰り返す
			while(!Immutable.is(tmp, prev)){
				prev = tmp;
				tmp.forEach((v)=>{
					let ltoken = <Lexer.Token>v.get("ltoken");
					let pattern = <Immutable.Seq<number, Lexer.Token>>v.get("pattern");
					let lookahead = <Lexer.Token>v.get("lookahead");
					let dot_index:number = pattern.findKey((v)=>{return v == SYMBOL_DOT});
					if(dot_index == pattern.size-1) return; // . が末尾にある場合はスキップ
					let symbol = pattern.get(dot_index+1);
					//if(symbol == ltoken) return; // 左辺の記号と.の次にある記号が同じ場合はスキップ
					if(!this.symbol_discriminator.isNonterminalSymbol(symbol)) return; // symbolが非終端記号でなければスキップ
					// クロージャー展開を行う
					// 先読み記号を導出
					let lookahead_set:Immutable.Set<Lexer.Token> = this.getFirst(pattern.slice(dot_index+1+1).toArray().concat(lookahead));
					let def:SyntaxDefinitionSection = findDef(symbol);
					// symbolを左辺にもつ全ての規則を、先読み記号を付与して追加
					for(let ii=0; ii<def.pattern.length; ii++){
						// 構文規則の右辺の一番左に.をつける
						let newpattern = Immutable.Seq((<Array<Lexer.Token>>[SYMBOL_DOT]).concat(def.pattern[ii]));
						// すべての先読み記号について追加
						lookahead_set.forEach((la)=>{
							tmp = tmp.add(Immutable.Map({ltoken: symbol, pattern: newpattern, lookahead: la}));
						});
					}
				});
			}
			let result: Immutable.OrderedSet<ClosureItem> = Immutable.OrderedSet<ClosureItem>();
			tmp.forEach((v)=>{
				result = result.add(this.convertImmutableClosureItem2Object(v));
			});
			return result;

		   /*
			// Arrayで展開するほうが楽
			let result:Array<ClosureItem> = start.toArray();
			for(let i=0; i<result.length; i++){
				let ltoken = result[i].ltoken;
				let pattern = result[i].pattern;
				console.log("pattern:",pattern);

				let dot_index:number = pattern.indexOf(SYMBOL_DOT); // . の位置
				if(dot_index == pattern.length - 1) continue; // .が末尾にある場合はスキップ
				let symbol = pattern[dot_index+1];
				// if(symbol == ltoken) continue; // 左辺の記号と.の次にある記号が同じ場合はスキップ
				if(!this.symbol_discriminator.isNonterminalSymbol(symbol)) continue; // symbolが非終端記号でなければスキップ
				// .の次に非終端記号が存在する
				// クロージャー展開を行う
				// 先読み記号を導出
				console.log("expand closure");
				console.log("dot_index:", dot_index);
				let lookahead_set:Immutable.Set<Lexer.Token> = this.getFirst(pattern.slice(dot_index+1+1).concat(result[i].lookahead));
				let def:SyntaxDefinitionSection = findDef(symbol);
				for(let ii=0; ii<def.pattern.length; ii++){
					let newpattern = (<Array<Lexer.Token>>[SYMBOL_DOT]).concat(def.pattern[ii]);
					lookahead_set.forEach((la)=>{
						result.push({ltoken: symbol, pattern: newpattern, lookahead: la});
					});
				}
			}
			let a:Immutable.Seq<number,number> = Immutable.Seq([1,2,3]);
			a = Immutable.Seq(a.slice());
			//a:Immutable.Seq<number, 
			return Immutable.OrderedSet<ClosureItem>(result);
			*/
		}
		// DFAのノードをImmutableデータ構造を使った形式に変換
		private convertDFANode2Immutable(node: DFANode):ImmutableDFANode{
			let closure:Immutable.OrderedSet<ImmutableClosureItem> = node.closure.map((item)=>{return this.convertClosureItem2Immutable(item)}).toOrderedSet();
			let tmp = {closure:closure, edge:node.edge};
			
			return Immutable.Map<string, Immutable.OrderedSet<ImmutableClosureItem>|DFAEdge>(tmp);
		}
		// Immutableのデータ構造によって構築されたDFAのノードをオブジェクトに変換
		private convertImmutableDFANode2Object(node_im: ImmutableDFANode):DFANode{
			let immutable_closure = <Immutable.OrderedSet<ImmutableClosureItem>>node_im.get("closure");
			let closure = immutable_closure.map((item)=>{return this.convertImmutableClosureItem2Object(item)}).toOrderedSet();
			return {closure: closure, edge: <DFAEdge>node_im.get("edge")};
		}
		private generateDFA(){
			let first_item:ClosureItem = {ltoken: SYMBOL_SYNTAX, pattern:[SYMBOL_DOT, this.start_symbol], lookahead: Lexer.SYMBOL_EOF};
			let first_closure = Immutable.OrderedSet([first_item]);
			first_closure = this.expandClosure(first_closure);
			let dfa = Immutable.List<ImmutableDFANode>();
			dfa = dfa.push(this.convertDFANode2Immutable({closure: first_closure, edge: Immutable.Map<Lexer.Token, number>()}));

			let prev = null;
			while(!Immutable.is(dfa, prev)){
				prev = dfa;
				dfa.forEach((current_node, index)=>{
					let closure = <Immutable.OrderedSet<ImmutableClosureItem>>current_node.get("closure");
					let edge = <DFAEdge>current_node.get("edge");
					let new_items = Immutable.Map<Lexer.Token, Immutable.OrderedSet<ImmutableClosureItem>>();
					// 規則から新しい規則を生成し、対応する記号ごとにまとめる
					closure.forEach((item)=>{
						let ltoken = <Lexer.Token>item.get("ltoken");
						let pattern = <Immutable.Seq<number, Lexer.Token>>item.get("pattern");
						let lookahead = <Lexer.Token>item.get("lookahead");

						let dot_index:number = pattern.findKey((v)=>{return v == SYMBOL_DOT});
						if(dot_index == pattern.size-1) return; // . が末尾にある場合はスキップ
						// .を右の要素と交換する
						let sort_flg = true;
						let edge_label:Lexer.Token = null;
						let newpattern = Immutable.Seq<number, Lexer.Token>(pattern.sort((front,behind)=>{
							if(front == SYMBOL_DOT && sort_flg){
								// .があった場合は次の要素と交換
								sort_flg = false; // 一度しかずらさない
								edge_label = behind; // 交換した記号を保持
								return 1;
							}
							// 通常は何もしない
							return 0;
						}));
						let newitem = Immutable.Map<string, Immutable.Seq<number, Lexer.Token>>({ltoken:ltoken, pattern:newpattern, lookahead:lookahead});
						let itemset;
						if(new_items.has(edge_label)){
							// 既に同じ記号が登録されている
							itemset = new_items.get(edge_label);
						}
						else{
							// 同じ記号が登録されていない
							itemset = Immutable.OrderedSet<ImmutableClosureItem>();
						}
						itemset = itemset.add(newitem);
						new_items = new_items.set(edge_label, itemset);
					});
					// 新しいノードを生成する
					new_items.forEach((itemset, edge_label)=>{
						let newnode:DFANode = {closure: Immutable.OrderedSet<ClosureItem>(), edge:Immutable.Map<Lexer.Token, number>()};
						// それぞれの規則を追加する
						itemset.forEach((item)=>{
							newnode.closure = newnode.closure.add(this.convertImmutableClosureItem2Object(item));
						});
						// クロージャー展開する
						newnode.closure = this.expandClosure(newnode.closure);
						let newnode_immutable = this.convertDFANode2Immutable(newnode);
						// 同一のclosureを持つ状態がないかどうか調べる
						let i = dfa.map((n)=>{return n.get("closure");}).keyOf(newnode_immutable.get("closure"));
						let index_to;
						if(i === undefined){
							// 既存の状態と重複しない
							// 新しい状態としてDFAに追加し、現在のノードから辺を張る
							dfa = dfa.push(newnode_immutable);
							index_to = dfa.size-1;
						}
						else{
							// 既存の状態と規則が重複する
							// 新しい状態の追加は行わず、重複する既存ノードに対して辺を張る
							index_to = i;
						}
						// 辺を追加
						edge = edge.set(edge_label, index_to);
						// DFAを更新
						dfa = dfa.set(index, Immutable.Map({closure: closure, edge: edge}));
						if(index_to == 5){
							console.log("to 5:");
							console.log(closure);
							console.log(edge);
						}
					});
				});
			}
			console.log(dfa);
			console.log(this.mergeLA(dfa));
			/*
			console.log(first_closure);
			first_closure.forEach((v)=>{
				console.log(v);
			});*/
		}
		// LR(1)オートマトンの先読み部分をマージして、LALR(1)オートマトンを作る
		private mergeLA(dfa:Immutable.List<ImmutableDFANode>): Immutable.List<ImmutableDFANode>{
			let array: Array<DFANode> = dfa.toArray().map((node)=>{return this.convertImmutableDFANode2Object(node);});
			// DFAからLR(0)テーブル部分のみを抽出した配列を生成
			let lr0_itemsets:Array<Immutable.OrderedSet<Immutable.Map<string, Lexer.Token|Immutable.Seq<number, Lexer.Token>>>> = dfa.map((node)=>{
				// クロージャー部分を取得
				let closure = <ImmutableClosureSet>node.get("closure");
				// 先読み部分を消したものを取得
				return closure.map((item)=>{
					return item.delete("lookahead");
				}).toOrderedSet();
			}).toArray();
			let merge_to = Immutable.Map<number, number>();;
			for(let i=0; i<array.length; i++){
				if(array[i] == null) continue;
				for(let ii=i+1; ii<array.length; ii++){
					if(array[ii] == null) continue;
					// LR(0)アイテムセット部分が重複
					if(Immutable.is(lr0_itemsets[i], lr0_itemsets[ii])){
						// ii番目の先読み部分をi番目にマージする
						// インデックス番号の大きい方が削除される
						// つまり項全体をマージ
						// 辺情報は、対象となる辺もいずれマージされて消えるため操作しなくてよい
						let merged_closure_to_im = this.convertClosureSet2Immutable(array[i].closure); // マージ先のクロージャー(Immutable)
						let merged_closure_from_im = this.convertClosureSet2Immutable(array[ii].closure); // 削除される方のクロージャー(Immutable)

						let merged_closure = merged_closure_to_im.merge(merged_closure_from_im);
						array[i].closure = this.convertImmutableClosureSet2Object(merged_closure); // 更新
						merge_to = merge_to.set(ii, i);
						// ii番目を削除
						array[ii] = null;
					}
				}
			}
			// 削除した部分を配列から抜き取る
			let prev_length = array.length; // ノードをマージする前のノード総数
			let fix = new Array(prev_length); // (元のindex->現在のindex)の対応表を作る
			let d = 0; // ずれ
			// nullで埋めた部分を消すことによるindexの変化
			for(let i=0; i<prev_length; i++){
				if(array[i] === null) d += 1; // ノードが削除されていた場合、以降のインデックスを1つずらす
				else fix[i] = i - d;
			}
			// 配列からnull埋めした部分を削除
			for(let i=array.length-1; i>=0; i--){
				if(array[i] === null) array.splice(i, 1); // 配列から抜き取る
			}
			// fixのノードが削除された部分を埋める
			merge_to.forEach((to, from)=>{
				let index = to;
				while(merge_to.has(index)) index = merge_to.get(index);
				fix[from] = fix[index]; // toを繰り返し辿っているので未定義部分へのアクセスは発生しない
				console.log("from:",from,",to:",index,"(",to,")");
			});

			let result:Immutable.List<ImmutableDFANode> = Immutable.List<ImmutableDFANode>();
			// インデックスの対応表をもとに辺情報を書き換える
			array.forEach((node)=>{
				node.edge = node.edge.map((node_index)=>{
					return fix[node_index];
				}).toMap();
				result = result.push(this.convertDFANode2Immutable(node));
			});
			
			return result;
		}
	}
}

