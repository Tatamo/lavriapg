import * as Immutable from "immutable";
import {FirstSet} from "./firstset";
import {NullableSet} from "./nullableset";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {Token, SYMBOL_EOF, SYMBOL_SYNTAX, SYMBOL_DOT} from "../def/token";
import {SyntaxDefinitionSection, GrammarDefinition} from "../def/grammar";
import {ShiftOperation, ReduceOperation, ConflictedOperation, AcceptOperation, GotoOperation, ParsingOperation, ParsingTable} from "../def/parsingtable";
import {ParserCallback, Parser} from "../parser/parser";
import {ParserFactory} from "../parser/factory";

type ClosureItem = {syntax_id: number, ltoken: Token, pattern: Immutable.Seq<number, Token>, lookahead: Token};
type ImmutableClosureItem = Immutable.Map<string,number | Token | Immutable.Seq<number, Token>>;
type ClosureSet = Immutable.OrderedSet<ClosureItem>;
type ImmutableClosureSet = Immutable.OrderedSet<ImmutableClosureItem>;
type DFAEdge = Immutable.Map<Token, number>;
type DFANode = {closure: ClosureSet, edge: DFAEdge};
type DFA = Array<DFANode>;

export class ParserGenerator{
	private nulls: NullableSet;
	private first: FirstSet;
	private lr_dfa: DFA;
	private lalr_dfa: DFA;
	private parsing_table: ParsingTable;
	private symbols: SymbolDiscriminator;
	constructor(private grammar: GrammarDefinition){
		this.symbols = new SymbolDiscriminator(this.grammar.syntax);
		this.nulls = new NullableSet(this.grammar);
		this.first = new FirstSet(this.grammar, this.symbols, this.nulls);
		this.init();
	}
	init(){
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

	private convertClosureItem2Immutable(item: ClosureItem):ImmutableClosureItem{
		return Immutable.Map({syntax_id: item.syntax_id, ltoken: item.ltoken, pattern: Immutable.Seq<Token>(item.pattern), lookahead: item.lookahead});
	}
	private convertImmutableClosureItem2Object(item_im: ImmutableClosureItem):ClosureItem{
		return {syntax_id: <number>item_im.get("syntax_id"), ltoken: <Token>item_im.get("ltoken"), pattern: (<Immutable.Seq<number, Token>>item_im.get("pattern")), lookahead: <Token>item_im.get("lookahead")};
	}
	private convertClosureSet2Immutable(closure: ClosureSet):ImmutableClosureSet{
		return closure.map((item:ClosureItem)=>{return this.convertClosureItem2Immutable(item);}).toOrderedSet();
	}
	private convertImmutableClosureSet2Object(closure_im: ImmutableClosureSet):ClosureSet{
		return closure_im.map((item_im:ImmutableClosureItem)=>{return this.convertImmutableClosureItem2Object(item_im);}).toOrderedSet();
	}

	// クロージャー展開を行う
	private expandClosure(start: ClosureSet): ClosureSet{
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
		let prev_size = -1;
		// 変更がなくなるまで繰り返す
		while(tmp.size != prev_size){
			prev_size = tmp.size;
			tmp.forEach((v:ImmutableClosureItem)=>{
				let ltoken = <Token>v.get("ltoken");
				let pattern = <Immutable.Seq<number, Token>>v.get("pattern");
				let lookahead = <Token>v.get("lookahead");
				let dot_index:number = pattern.findKey((v:Token)=>{return v == SYMBOL_DOT});
				if(dot_index == pattern.size-1) return; // . が末尾にある場合はスキップ
				let symbol = pattern.get(dot_index+1);
				//if(symbol == ltoken) return; // 左辺の記号と.の次にある記号が同じ場合はスキップ
				if(!this.symbols.isNonterminalSymbol(symbol)) return; // symbolが非終端記号でなければスキップ
				// クロージャー展開を行う
				// 先読み記号を導出
				let lookahead_set:Immutable.Set<Token> = this.first.get(pattern.slice(dot_index+1+1).toArray().concat(lookahead));

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
		let first_item:ClosureItem = {syntax_id: -1, ltoken: SYMBOL_SYNTAX, pattern:Immutable.Seq([SYMBOL_DOT, this.grammar.start_symbol]), lookahead: SYMBOL_EOF};
		let first_closure = Immutable.OrderedSet([first_item]);
		first_closure = this.expandClosure(first_closure);
		let dfa:DFA = new Array<DFANode>();
		dfa.push({closure: first_closure, edge: Immutable.Map<Token, number>()});

		let flg_done = false;
		console.log("start generate DFA");
		console.time("generateDFA");
		let cnt = 0;
		let timesum:number = 0;
		while(!flg_done){
			flg_done = true;
			dfa.forEach((current_node:DFANode, index:number)=>{
				cnt++;
				let closure:ClosureSet = current_node.closure;
				let edge:DFAEdge = current_node.edge;
				let new_items = Immutable.Map<Token, ClosureSet>();


				// 規則から新しい規則を生成し、対応する記号ごとにまとめる
				closure.forEach((item:ClosureItem)=>{
					let syntax_id:number = item.syntax_id;
					let ltoken:Token = item.ltoken;
					let pattern:Immutable.Seq<number, Token> = item.pattern;
					let lookahead:Token = item.lookahead;

					let dot_index:number = pattern.keyOf(SYMBOL_DOT);
					if(dot_index == pattern.size-1) return; // . が末尾にある場合はスキップ
					// .を右の要素と交換する
					let sort_flg = true;
					let edge_label:Token = pattern.get(dot_index+1);
					// TODO:高速化
					//let pattern_ = pattern.slice();
					let newpattern:Immutable.Seq<number,Token> = Immutable.Seq<number,Token>(pattern.sort((front:Token,behind:Token)=>{
						if(front == SYMBOL_DOT && sort_flg){
							// .があった場合は次の要素と交換
							sort_flg = false; // 一度しかずらさない
							return 1;
						}
						// 通常は何もしない
						return 0;
					}));
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

					// TODO:高速化(ここがボトルネック)
					let closureset:Array<ImmutableClosureSet> = dfa.map((n:DFANode)=>{return this.convertClosureSet2Immutable(n.closure)});
					let i = -1;
					for(let ii=0; ii<closureset.length; ii++){
						if(Immutable.is(closureset[ii], this.convertClosureSet2Immutable(newnode.closure))){
							i = ii;
							break;
						}
					}

					let index_to;
					if(i == -1){
						// 既存の状態と重複しない
						// 新しい状態としてDFAに追加し、現在のノードから辺を張る
						dfa.push(newnode);
						index_to = dfa.length-1;

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
						dfa[index] = {closure: closure, edge: edge};
					}
				});
			});
		}

		console.timeEnd("generateDFA");
		console.log("time:",timesum);
		console.log("loop count:", cnt);
		let obj_lr_dfa = dfa;
		//let obj_lr_dfa = this.convertImmutableDFA2Obj(dfa);
		this.lr_dfa = obj_lr_dfa;
		this.lalr_dfa = this.mergeLA(obj_lr_dfa);
	}




	// LR(1)オートマトンの先読み部分をマージして、LALR(1)オートマトンを作る
	private mergeLA(dfa:DFA): DFA{
		let array: Array<DFANode|null> = dfa;
		// DFAからLR(0)テーブル部分のみを抽出した配列を生成
		let lr0_itemsets:Array<Immutable.OrderedSet<Immutable.Map<string, number|Token|Immutable.Seq<number, Token>>>> = dfa.map((node:DFANode)=>{
			// クロージャー部分を取得
			let closure:ImmutableClosureSet = this.convertClosureSet2Immutable(node.closure);
			// 先読み部分を消したものを取得
			return closure.map((item:ImmutableClosureItem)=>{
				return item.delete("lookahead");
			}).toOrderedSet();
		});
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

		let result:DFA = new Array<DFANode>();
		// インデックスの対応表をもとに辺情報を書き換える
		shortened.forEach((node:DFANode)=>{
			node.edge = node.edge.map((node_index:number)=>{
				return fix[node_index];
			}).toMap();
			result.push(node);
		});
		
		return result;
	}

	private generateParsingTable(dfa:DFA){
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
				if(item.pattern.get(item.pattern.size-1) != SYMBOL_DOT) return;
				else{
					// acceptオペレーションの条件を満たすかどうか確認
					// S' -> S . [$] の規則が存在するか調べる
					let flg_accept = true;
					// S' -> S . [$] の規則のidは-1
					if(item.syntax_id != -1) flg_accept = false;
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

