import * as Immutable from "immutable";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {Token, SYMBOL_EOF, SYMBOL_SYNTAX, SYMBOL_DOT} from "../def/token";
import {SyntaxDefinitionSection, GrammarDefinition} from "../def/grammar";
import {ShiftOperation, ReduceOperation, ConflictedOperation, AcceptOperation, GotoOperation, ParsingOperation, ParsingTable} from "../def/parsingtable";
import {ParserCallback, Parser} from "../parser/parser";
import {ParserFactory} from "../parser/factory";

type Constraint = Array<{superset:Token, subset:Token}>;
type ClosureItem = {syntax_id: number, ltoken: Token, pattern: Array<Token>, lookahead: Token};
type ImmutableClosureItem = Immutable.Map<string,number | Token | Immutable.Seq<number, Token>>;
type ClosureSet = Immutable.OrderedSet<ClosureItem>;
type ImmutableClosureSet = Immutable.OrderedSet<ImmutableClosureItem>;
type DFAEdge = Immutable.Map<Token, number>;
type DFANode = {closure: ClosureSet, edge: DFAEdge};

export class ParserGenerator{
	private nulls:Immutable.Set<Token>;
	private first_map: Immutable.Map<Token, Immutable.Set<Token>>;
	private follow_map: Immutable.Map<Token, Immutable.Set<Token>>;
	private lr_dfa: Immutable.List<DFANode>;
	private lalr_dfa: Immutable.List<DFANode>;
	private parsing_table: ParsingTable;
	private symbols: SymbolDiscriminator;
	constructor(private grammar: GrammarDefinition){
		this.symbols = new SymbolDiscriminator(this.grammar.syntax);

		this.init();
	}
	init(){
		this.generateNulls();
		this.generateFirst();
		this.generateDFA();
		let lalr_result = this.generateParsingTable(this.lalr_dfa);
		if(lalr_result.success){
			this.parsing_table = lalr_result.table;
		}
		else{
			console.log("LALR parsing conflict found. return LR(1) table.");
			let lr_result = this.generateParsingTable(this.lr_dfa);
			this.parsing_table = lr_result.table;
			if(!lr_result.success){
				console.log("LR(1) parsing conflict found. return LR(1) conflicted table.");
			}
		}
	}
	public getParser(default_callback?: ParserCallback):Parser{
		return ParserFactory.create(this.grammar, this.parsing_table, default_callback);
	}
	public getParsingTable():ParsingTable{
		return this.parsing_table;
	}
	private isNullable(x:Token){
		return this.nulls.includes(x);
	}
	// nulls初期化
	private generateNulls(){
		// 制約条件を導出するために、
		// 空列になりうる記号の集合nullsを導出
		this.nulls = Immutable.Set<Token>();
		for(let i=0; i<this.grammar.syntax.length; i++){
			let ltoken = this.grammar.syntax[i].ltoken;
			let pattern = this.grammar.syntax[i].pattern;

			// 右辺の記号の数が0の規則を持つ記号は空列になりうる
			if(pattern == []){
				this.nulls = this.nulls.add(ltoken);
			}
		}
		let flg_changed:boolean = true;
		// 変更が起きなくなるまでループする
		while(flg_changed){
			flg_changed = false;
			for(let i=0; i<this.grammar.syntax.length; i++){
				let ltoken = this.grammar.syntax[i].ltoken;

				// 既にnullsに含まれていればスキップ
				if(this.isNullable(ltoken)) continue;

				let pattern = this.grammar.syntax[i].pattern;
				let flg_nulls = true;
				// 右辺に含まれる記号がすべてnullableの場合はその左辺はnullable
				for(let ii=0; ii<pattern.length; ii++){
					if(!this.isNullable(pattern[ii])){
						flg_nulls = false;
						break;
					}
				}
				if(flg_nulls){
					if(this.nulls.includes(ltoken)) flg_changed = true;
					this.nulls = this.nulls.add(ltoken);
				}
			}
		}
	}
	// 制約条件がすべて満たされたかどうかを判定する
	// 与えられたtable内の配列がソートされていることを前提とする
	private isConstraintFilled(constraint:Constraint, table:Immutable.Map<Token, Immutable.Set<Token>>): boolean{
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
		let first_result: Immutable.Map<Token, Immutable.Set<Token>> = Immutable.Map<Token, Immutable.Set<Token>>();
		// 初期化
		// FIRST($) = {$} だけ手動で追加
		first_result = first_result.set(SYMBOL_EOF, Immutable.Set<Token>([SYMBOL_EOF]));
		let terminal_symbols = this.symbols.getTerminalSymbols();
		terminal_symbols.forEach((value:Token)=>{
			first_result = first_result.set(value, Immutable.Set<Token>([value]));
		});
		let nonterminal_symbols = this.symbols.getNonterminalSymbols();
		nonterminal_symbols.forEach((value:Token)=>{
			first_result = first_result.set(value, Immutable.Set<Token>());
		});

		// 包含についての制約を生成
		let constraint:Constraint = [];
		for(let i=0; i<this.grammar.syntax.length; i++){
			let def = this.grammar.syntax[i];
			let sup = def.ltoken;
			let pattern = def.pattern;
			for(let ii=0; ii<pattern.length; ii++){
				let sub = pattern[ii];
				if(sup != sub){
					constraint.push({superset: sup, subset: sub});
				}
				if(!this.isNullable(sub)){
					break;
				}
			}
		}

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
		this.first_map = first_result;
	}
	/*
	// SLR法で使うやつ
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
		let follow_result:Map<Token, Array<Token>> = new Map();
		let nonterminal_symbols = this.symbols.getNonterminalSymbols();
		for(let i=0; i<nonterminal_symbols.length; i++){
			follow_result.set(nonterminal_symbols[i], []);
		}

		for(let i=0; i<this.grammar.syntax.length; i++){
			let ltoken = this.grammar.syntax[i].ltoken;
			let pattern = this.grammar.syntax[i].pattern;
			for(let ii=0; ii<pattern.length; ii++){
				// 一番右を除いてループ(べつにその必要はないが)
				for(let iii=0; iii<pattern[ii].length-1; iii++){
					let sup = pattern[ii][iii];
					if(this.symbols.isTerminalSymbol(sup)){
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

		let sort_with_symbol = (x:Token, y:Token) =>{
			let symbols = [];
			return ((x:Token, y:Token) =>{
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
		for(let i=0; i<this.grammar.syntax.length; i++){
			let def = this.grammar.syntax[i];
			let sub = def.ltoken; // 左辺の記号はsubsetになる
			let pattern = def.pattern;
			for(let ii=0; ii<pattern.length; ii++){
				// 右端から左に見ていく
				for(let iii=pattern[ii].length-1; iii>=0; iii--){
					let sup = pattern[ii][iii];
					// supが終端記号ならスキップ(nullsに含まれていないことは自明なのでここでbreakする)
					if(this.symbols.isTerminalSymbol(sup)){
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
	private getFirst(arg: Token):Immutable.Set<Token>;
	private getFirst(arg: Array<Token>):Immutable.Set<Token>;
	private getFirst(arg: Token|Array<Token>): Immutable.Set<Token>{
		if(!Array.isArray(arg)){
			return this.first_map.get(arg);
		}
		let w: Array<Token> = arg;

		let result: Immutable.Set<Token> = Immutable.Set<Token>();
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
		return Immutable.Map({syntax_id: item.syntax_id, ltoken: item.ltoken, pattern: Immutable.Seq<Token>(item.pattern), lookahead: item.lookahead});
	}
	private convertImmutableClosureItem2Object(item_im: ImmutableClosureItem):ClosureItem{
		return {syntax_id: <number>item_im.get("syntax_id"), ltoken: <Token>item_im.get("ltoken"), pattern: (<Immutable.Seq<number, Token>>item_im.get("pattern")).toArray(), lookahead: <Token>item_im.get("lookahead")};
	}
	private convertClosureSet2Immutable(closure: ClosureSet):ImmutableClosureSet{
		return closure.map((item:ClosureItem)=>{return this.convertClosureItem2Immutable(item);}).toOrderedSet();
	}
	private convertImmutableClosureSet2Object(closure_im: ImmutableClosureSet):ClosureSet{
		return closure_im.map((item_im:ImmutableClosureItem)=>{return this.convertImmutableClosureItem2Object(item_im);}).toOrderedSet();
	}
	// クロージャー展開を行う
	private expandClosure(start: Immutable.OrderedSet<ClosureItem>): Immutable.OrderedSet<ClosureItem>{
		// 非終端記号xに対し、それが左辺として対応する定義を返す
		let findDef = (x:Token):Array<{id: number, def: SyntaxDefinitionSection}> =>{
			let result:Array<{id:number, def: SyntaxDefinitionSection}> = new Array();
			for(let i=0; i<this.grammar.syntax.length; i++){
				if(this.grammar.syntax[i].ltoken == x){
					result.push({id: i, def: this.grammar.syntax[i]});
				}
			}
			return result;
		};
		let tmp:Immutable.OrderedSet<ImmutableClosureItem> = Immutable.OrderedSet<ImmutableClosureItem>();
		start.forEach((v:ClosureItem)=>{
			tmp = tmp.add(this.convertClosureItem2Immutable(v));
		});
		let prev = null;
		// 変更がなくなるまで繰り返す
		while(!Immutable.is(tmp, prev)){
			prev = tmp;
			tmp.forEach((v:ImmutableClosureItem)=>{
				let ltoken = <Token>v.get("ltoken");
				let pattern = <Immutable.Seq<number, Token>>v.get("pattern");
				let lookahead = <Token>v.get("lookahead");
				let dot_index:number = pattern.findKey((v)=>{return v == SYMBOL_DOT});
				if(dot_index == pattern.size-1) return; // . が末尾にある場合はスキップ
				let symbol = pattern.get(dot_index+1);
				//if(symbol == ltoken) return; // 左辺の記号と.の次にある記号が同じ場合はスキップ
				if(!this.symbols.isNonterminalSymbol(symbol)) return; // symbolが非終端記号でなければスキップ
				// クロージャー展開を行う
				// 先読み記号を導出
				let lookahead_set:Immutable.Set<Token> = this.getFirst(pattern.slice(dot_index+1+1).toArray().concat(lookahead));

				let def:Array<{id:number, def:SyntaxDefinitionSection}> = findDef(symbol);
				// symbolを左辺にもつ全ての規則を、先読み記号を付与して追加
				def.forEach((syntax:{id:number, def:SyntaxDefinitionSection})=>{
					// 構文規則の右辺の一番左に.をつける
					let new_pattern = Immutable.Seq((<Array<Token>>[SYMBOL_DOT]).concat(syntax.def.pattern));
					// すべての先読み記号について追加
					lookahead_set.forEach((la:Token)=>{
						tmp = tmp.add(Immutable.Map({syntax_id: syntax.id, ltoken: symbol, pattern: new_pattern, lookahead: la}));
					});
				});
			});
		}
		let result: Immutable.OrderedSet<ClosureItem> = Immutable.OrderedSet<ClosureItem>();
		tmp.forEach((v:ImmutableClosureItem)=>{
			result = result.add(this.convertImmutableClosureItem2Object(v));
		});
		return result;

	}

	private generateDFA(){
		let first_item:ClosureItem = {syntax_id: 0, ltoken: SYMBOL_SYNTAX, pattern:[SYMBOL_DOT, this.grammar.start_symbol], lookahead: SYMBOL_EOF};
		let first_closure = Immutable.OrderedSet([first_item]);
		first_closure = this.expandClosure(first_closure);
		let dfa = Immutable.List<DFANode>();
		dfa = dfa.push({closure: first_closure, edge: Immutable.Map<Token, number>()});

		let flg_done = false;
		while(!flg_done){
			flg_done = true;
			dfa.forEach((current_node:DFANode, index:number)=>{
				let closure:ClosureSet = current_node.closure;
				let edge:DFAEdge = current_node.edge;
				let new_items = Immutable.Map<Token, ClosureSet>();
				// 規則から新しい規則を生成し、対応する記号ごとにまとめる
				closure.forEach((item:ClosureItem)=>{
					let syntax_id:number = item.syntax_id;
					let ltoken:Token = item.ltoken;
					let pattern:Array<Token> = item.pattern;
					let lookahead:Token = item.lookahead;

					let dot_index:number = pattern.indexOf(SYMBOL_DOT);
					if(dot_index == pattern.length-1) return; // . が末尾にある場合はスキップ
					// .を右の要素と交換する
					let sort_flg = true;
					let edge_label:Token = pattern[dot_index+1];
					// TODO:高速化
					let pattern_ = pattern.slice();
					let newpattern:Array<Token> = pattern_.sort((front,behind)=>{
						if(front == SYMBOL_DOT && sort_flg){
							// .があった場合は次の要素と交換
							sort_flg = false; // 一度しかずらさない
							return 1;
						}
						// 通常は何もしない
						return 0;
					});
					let newitem:ClosureItem = {syntax_id: syntax_id, ltoken:ltoken, pattern:newpattern, lookahead:lookahead};
					let itemset:ClosureSet;
					if(new_items.has(edge_label)){
						// 既に同じ記号が登録されている
						itemset = new_items.get(edge_label);
					}
					else{
						// 同じ記号が登録されていない
						itemset = Immutable.OrderedSet<ClosureItem>();
					}
					itemset = itemset.add(newitem);
					new_items = new_items.set(edge_label, itemset);
				});
				// 新しいノードを生成する
				new_items.forEach((itemset:ClosureSet, edge_label:Token)=>{
					let newnode:DFANode = {closure: itemset, edge:Immutable.Map<Token, number>()};

					// クロージャー展開する
					newnode.closure = this.expandClosure(newnode.closure);
					// 同一のclosureを持つ状態がないかどうか調べる
					// 一度Immutableに変換して比較
					//let i = dfa.map((n:DFANode)=>{return this.convertDFANode2Immutable(n).get("closure");}).keyOf(newnode_immutable.get("closure"));
					let i = dfa.map((n:DFANode)=>{return this.convertClosureSet2Immutable(n.closure)}).keyOf(this.convertClosureSet2Immutable(newnode.closure));
					let index_to;
					if(i === undefined){
						// 既存の状態と重複しない
						// 新しい状態としてDFAに追加し、現在のノードから辺を張る
						dfa = dfa.push(newnode);
						index_to = dfa.size-1;

						flg_done = false;
					}
					else{
						// 既存の状態と規則が重複する
						// 新しい状態の追加は行わず、重複する既存ノードに対して辺を張る
						index_to = i;
					}
					// 辺を追加
					let edge_num_prev = edge.size;
					edge = edge.set(edge_label, index_to);
					if(edge.size != edge_num_prev){
						// 新しい辺が追加された
						flg_done = false;
						// DFAを更新
						dfa = dfa.set(index, {closure: closure, edge: edge});
					}
				});
			});
		}

		let obj_lr_dfa = dfa;
		//let obj_lr_dfa = this.convertImmutableDFA2Obj(dfa);
		this.lr_dfa = obj_lr_dfa;
		this.lalr_dfa = this.mergeLA(obj_lr_dfa);
	}




	// LR(1)オートマトンの先読み部分をマージして、LALR(1)オートマトンを作る
	private mergeLA(dfa:Immutable.List<DFANode>): Immutable.List<DFANode>{
		let array: Array<DFANode|null> = dfa.toArray();
		// DFAからLR(0)テーブル部分のみを抽出した配列を生成
		let lr0_itemsets:Array<Immutable.OrderedSet<Immutable.Map<string, number|Token|Immutable.Seq<number, Token>>>> = dfa.map((node:DFANode)=>{
			// クロージャー部分を取得
			let closure:ImmutableClosureSet = this.convertClosureSet2Immutable(node.closure);
			// 先読み部分を消したものを取得
			return closure.map((item:ImmutableClosureItem)=>{
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
					let merged_closure_to_im = this.convertClosureSet2Immutable(array[i]!.closure); // マージ先のクロージャー(Immutable)
					let merged_closure_from_im = this.convertClosureSet2Immutable(array[ii]!.closure); // 削除される方のクロージャー(Immutable)

					let merged_closure = merged_closure_to_im.merge(merged_closure_from_im);
					array[i]!.closure = this.convertImmutableClosureSet2Object(merged_closure); // 更新
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
		// 配列からnull埋めした部分を削除したものを作る
		let shortened:Array<DFANode> = [];
		array.forEach((node:DFANode|null)=>{
			if(node !== null) shortened.push(node);
		});
		// fixのノードが削除された部分を埋める
		merge_to.forEach((to:number, from:number)=>{
			let index = to;
			while(merge_to.has(index)) index = merge_to.get(index);
			fix[from] = fix[index]; // toを繰り返し辿っているので未定義部分へのアクセスは発生しない
		});

		let result:Immutable.List<DFANode> = Immutable.List<DFANode>();
		// インデックスの対応表をもとに辺情報を書き換える
		shortened.forEach((node:DFANode)=>{
			node.edge = node.edge.map((node_index:number)=>{
				return fix[node_index];
			}).toMap();
			result = result.push(node);
		});
		
		return result;
	}

	private generateParsingTable(dfa:Immutable.List<DFANode>){
		let parsing_table:ParsingTable = new Array<Map<Token, ParsingOperation>>();
		let flg_conflicted = false;
		// 構文解析表を構築
		dfa.forEach((node:DFANode)=>{
			let table_row = new Map<Token, ParsingOperation>();
			// 辺をもとにshiftとgotoオペレーションを追加
			node.edge.forEach((to:number, label:Token)=>{
				if(this.symbols.isTerminalSymbol(label)){
					// ラベルが終端記号の場合
					// shiftオペレーションを追加
					let operation:ShiftOperation = {type: "shift", to: to};
					table_row.set(label, operation);
				}
				else if(this.symbols.isNonterminalSymbol(label)){
					// ラベルが非終端記号の場合
					// gotoオペレーションを追加
					let operation:GotoOperation = {type: "goto", to: to};
					table_row.set(label, operation);
				}
			});

			// acceptとreduceオペレーションを追加していく
			node.closure.forEach((item:ClosureItem)=>{
				// 規則末尾が.でないならスキップ
				if(item.pattern[item.pattern.length-1] != SYMBOL_DOT) return;
				else{
					// acceptオペレーションの条件を満たすかどうか確認
					// S' -> S . [$] の規則が存在するか調べる
					let flg_accept = true;
					if(item.syntax_id != 0) flg_accept = false;
					else if(item.ltoken != SYMBOL_SYNTAX) flg_accept = false;
					else if(item.lookahead != SYMBOL_EOF) flg_accept = false;
					if(flg_accept){
						// この規則を読み終わると解析終了
						// $をラベルにacceptオペレーションを追加
						let operation:AcceptOperation = {type: "accept"};
						table_row.set(SYMBOL_EOF, operation);
					}
					else{
						let label = item.lookahead;
						let operation:ReduceOperation = {type:"reduce", syntax: item.syntax_id};
						// 既に同じ記号でオペレーションが登録されていないか確認
						if(table_row.has(label)){
							// コンフリクトが発生
							flg_conflicted = true; // 構文解析に失敗
							let existing_operation = table_row.get(label)!; // 上で.has(label)のチェックを行っているためnon-nullable
							let conflicted_operation:ConflictedOperation = {type:"conflict", shift_to: [], reduce_syntax: []};
							if(existing_operation.type == "shift"){
								// shift/reduce コンフリクト
								conflicted_operation.shift_to = [existing_operation.to];
								conflicted_operation.reduce_syntax = [operation.syntax];
							}
							else if(existing_operation.type == "reduce"){
								// reduce/reduce コンフリクト
								conflicted_operation.shift_to = [];
								conflicted_operation.reduce_syntax = [existing_operation.syntax, operation.syntax];
							}
							else if(existing_operation.type == "conflict"){
								// もっとやばい衝突
								conflicted_operation.shift_to = existing_operation.shift_to;
								conflicted_operation.reduce_syntax = existing_operation.reduce_syntax.concat([operation.syntax]);
							}
							// とりあえず衝突したオペレーションを登録しておく
							table_row.set(label, conflicted_operation);
						}
						else{
							// 衝突しないのでreduceオペレーションを追加
							table_row.set(label, operation);
						}
					}
				}
			});
			parsing_table.push(table_row);
		});
		return {table: parsing_table, success: !flg_conflicted};
	}
}

