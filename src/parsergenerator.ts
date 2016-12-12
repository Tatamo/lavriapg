import * as Lexer from "lexer";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {SYMBOL_SYNTAX, SYMBOL_DOT, SyntaxDefinitionSection, SyntaxDefinitions} from "./syntaxdef";

import * as Immutable from "immutable";

export module ParserGenerator{
	type Constraint = Array<{superset:Lexer.Token, subset:Lexer.Token}>;
	type ClosureItem = {ltoken: Lexer.Token, pattern: Array<Lexer.Token>, lookahead: Lexer.Token};
	type MergedClosureItem = {ltoken: Lexer.Token, pattern: Array<Lexer.Token>, lookahead_set: Immutable.Set<Lexer.Token>};
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
		private getFirst(arg: Lexer.Token);
		private getFirst(arg: Array<Lexer.Token>);
		private getFirst(arg: Lexer.Token|Array<Lexer.Token>): Immutable.Set<Lexer.Token>{
			if(!Array.isArray(arg)){
				return this.first_map.get(arg);
			}
			let w: Array<Lexer.Token> = arg;
			console.log("w:",w);

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
			//type ListedClosureItem = {ltoken: Lexer.Token, pattern: Immutable.Seq<number,Lexer.Token>, lookahead: Lexer.Token};
			type ListedClosureItem = Immutable.Map<string,Lexer.Token | Immutable.Seq<number, Lexer.Token>>;
			let tmp:Immutable.OrderedSet<ListedClosureItem> = Immutable.OrderedSet<ListedClosureItem>();
			start.forEach((v)=>{
				tmp = tmp.add(Immutable.Map({ltoken: v.ltoken, pattern: Immutable.Seq<Lexer.Token>(v.pattern), lookahead: v.lookahead}));
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
					console.log("expand closure");
					console.log("dot_index:", dot_index);
					let lookahead_set:Immutable.Set<Lexer.Token> = this.getFirst(pattern.slice(dot_index+1+1).toArray().concat(lookahead));
					let def:SyntaxDefinitionSection = findDef(symbol);
					console.log("add",lookahead_set.size);
					for(let ii=0; ii<def.pattern.length; ii++){
						let newpattern = Immutable.Seq((<Array<Lexer.Token>>[SYMBOL_DOT]).concat(def.pattern[ii]));
						lookahead_set.forEach((la)=>{
							tmp = tmp.add(Immutable.Map({ltoken: symbol, pattern: newpattern, lookahead: la}));
						});
					}
				});
			}
			let result: Immutable.OrderedSet<ClosureItem> = Immutable.OrderedSet<ClosureItem>();
			tmp.forEach((v)=>{
				result = result.add({ltoken: <Lexer.Token>v.get("ltoken"), pattern: (<Immutable.Seq<number, Lexer.Token>>v.get("pattern")).toArray(), lookahead: <Lexer.Token>v.get("lookahead")});
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
		private generateDFA(){
			let first_item:ClosureItem = {ltoken: SYMBOL_SYNTAX, pattern:[SYMBOL_DOT, this.start_symbol], lookahead: Lexer.SYMBOL_EOF};
			let first_closure = Immutable.OrderedSet([first_item]);
			first_closure = this.expandClosure(first_closure);
			console.log("first", this.getFirst(["PLUS", "TERM", Lexer.SYMBOL_EOF]));
			console.log(first_closure);
			first_closure.forEach((v)=>{
				console.log(v);
			});
		}
		/*
		// バグがあるしそもそも設計自体正しくなかったので書き直す
		private generateGOTOGraph(){
			type Clause = { ltoken: Lexer.Token, pattern: Array<Lexer.Token> };
			type GraphEdge = { to: number, label: Lexer.Token };
			type GraphNode = { edge: Array<GraphEdge>, clause: Array<Clause> };
			let graph: Array<GraphNode> = [];

			// こんなところで関数定義しまくるな

			// 非終端記号xに対し、それが左辺として対応する定義を返す
			let findDef = (x:Lexer.Token):SyntaxDefinitionSection =>{
				for(let i=0; i<this.syntaxdef.length; i++){
					if(this.syntaxdef[i].ltoken == x){
						return this.syntaxdef[i];
					}
				}
				return null;
			};
			// 2つの配列の要素が同じであるか、等号演算子を用いた浅い比較を行う
			let checkSameArray = <T>(p1: Array<T>, p2: Array<T>): boolean =>{
				if(p1.length != p2.length) return false;
				let len = p1.length;
				for(let i=0; i<len; i++){
					if(p1[i] != p2[i]) return false;
				}
				return true;
			};
			// 2つのノードが辺を除いて同一であるか調べる
			// TODO: このコードが正しく動く証明
			let checkSameStateNode = (node1: GraphNode, node2:GraphNode): boolean =>{
				let c1 = node1.clause;
				let c2 = node2.clause;
				if(c1.length != c2.length) return false;
				let len = c1.length;
				for(let i = 0; i<len; i++){
					if(c1[i].ltoken != c2[i].ltoken) return false;
					let p1 = c1[i].pattern;
					let p2 = c2[i].pattern;
					if(!checkSameArray(p1, p2)) return false;
				}
				return true;
			};
			// ノードに対するクロージャー展開
			let expandGraphNode = (node: GraphNode): void =>{
				// ノードが持つ項をすべて調べる
				// 項の数はループ中に増加しうる
				for(let i=0; i<node.clause.length; i++){
					let ltoken = node.clause[i].ltoken;
					let pattern = node.clause[i].pattern;

					let dot_index:number = pattern.indexOf(SYMBOL_DOT); // . の位置
					if(dot_index == pattern.length - 1) continue; // .が末尾にある場合はスキップ
					let symbol = pattern[dot_index+1];
					if(symbol == ltoken) continue; // 左辺の記号と.の次にある記号が同じ場合はスキップ
					if(!this.symbol_discriminator.isNonterminalSymbol(symbol)) continue; // symbolが非終端記号でなければスキップ
					// .の次に非終端記号が存在する
					// クロージャー展開を行う
					let def:SyntaxDefinitionSection = findDef(symbol);
					for(let ii=0; ii<def.pattern.length; ii++){
						let newpattern = (<Array<Lexer.Token>>[SYMBOL_DOT]).concat(def.pattern[ii]);
						node.clause.push({ltoken: symbol, pattern: newpattern});
					}
				}
			};

			console.log("ready to construct graph");
			// 初期化
			graph.push({ edge: [], clause: [{ ltoken: SYMBOL_SYNTAX, pattern: [SYMBOL_DOT, this.start_symbol, Lexer.SYMBOL_EOF]}] });
			expandGraphNode(graph[0]); // 最初のノードを展開しておく

			console.log("start to construct graph");

			for(let i=0; i<graph.length; i++){
				let node = graph[i];
				for(let ii=0; ii<node.clause.length; ii++){
					let ltoken = node.clause[ii].ltoken;
					let pattern = node.clause[ii].pattern;
					
					let dot_index:number = pattern.indexOf(SYMBOL_DOT);
					if(dot_index == pattern.length - 1) continue; // .が末尾にある場合はスキップ
					let symbol = pattern[dot_index+1];
					
					// 新しい項を生成する
					let new_pattern = pattern.slice();
					// .を一つ後ろに移動
					new_pattern[dot_index+1] = SYMBOL_DOT;
					new_pattern[dot_index] = symbol;
					let new_clause = { ltoken: ltoken, pattern: new_pattern };

					// symbolに対して既に辺が張られているかどうかを調べる
					let flg_edge_exist = false;
					let target_node_index;
					for(let i_edge=0; i_edge<node.edge.length; i_edge++){
						let edge = node.edge[i_edge];
						if(edge.label == symbol) {
							flg_edge_exist = true;
							target_node_index = edge.to;
							break;
						}
					}

					// 既に同じラベルを持つ辺が存在した場合
					// 対象のノードに対して項を追加する
					if(flg_edge_exist) {
						graph[target_node_index].clause.push(new_clause);
					}
					// 存在しない場合
					// 新しいノードを作成する
					else{
						let newnode = { edge: [], clause: [new_clause] };
						
						// 展開
						expandGraphNode(newnode);

						let flg_duplicated = false;
						let duplicated_node: GraphNode;
						let duplicated_node_index: number;
						// 同一の項を持つノードが存在しないかどうか調べる
						for(let j=0; j<graph.length; j++){
							if(checkSameStateNode(newnode, graph[j])){
								flg_duplicated = true;
								duplicated_node = graph[j];
								duplicated_node_index = j;
								break;
							}
						}
						if(flg_duplicated){
							// 重複していた
							// 新しいノードの追加は行わず、既存ノードに対して辺を張る
							let flg_add_edge = true;
							for(let j=0; j<node.edge.length; j++){
								if(node.edge[j].to == duplicated_node_index){
									flg_add_edge = false;
									break;
								}
							}
							// まだ辺が張られていないならば辺を追加する
							if(flg_add_edge){
								node.edge.push({to: duplicated_node_index, label: symbol});
							}
						}
						else{
							// 新しいノードを登録する
							graph.push(newnode);
							let newnode_index = graph.length-1;
							node.edge.push({to: newnode_index, label: symbol}); // 新しいノードに対する辺を引く
						}
					}
				}
			}

			// toString()かませて文字列として出す
			for(let i=0; i<graph.length; i++){
				for(let ii=0; ii<graph[i].edge.length; ii++){
					graph[i].edge[ii].label = graph[i].edge[ii].label.toString();
				}
				for(let ii=0; ii<graph[i].clause.length; ii++){
					graph[i].clause[ii].ltoken = graph[i].clause[ii].ltoken.toString();
					for(let iii=0; iii<graph[i].clause[ii].pattern.length; iii++){
						graph[i].clause[ii].pattern[iii] = graph[i].clause[ii].pattern[iii].toString();
					}
				}
			}
			console.log(JSON.stringify(graph));
		}
	*/
	}
}

