import {Token, SYMBOL_SYNTAX, SYMBOL_EOF} from "../def/token";
import {ClosureItem, ClosureSet} from "./closure";
import {SyntaxDB} from "./syntaxdb";

import {ShiftOperation, ReduceOperation, ConflictedOperation, AcceptOperation, GotoOperation, ParsingOperation, ParsingTable} from "../def/parsingtable";

export type DFAEdge = Map<Token, number>;
export type DFANode = {closure: ClosureSet, edge: DFAEdge};
export type DFA = Array<DFANode>;

export class DFAGenerator{
	private lr_dfa:DFA;
	private lalr_dfa:DFA;
	constructor(private syntax: SyntaxDB){
		this.generateDFA();
	}
	public getLR1DFA():DFA{
		return this.lr_dfa;
	}
	public getLALR1DFA():DFA{
		return this.lalr_dfa;
	}
	private generateDFA(){
		let initial_item: ClosureItem = new ClosureItem(this.syntax, -1, 0, [SYMBOL_EOF]);
		let initial_set: ClosureSet = new ClosureSet(this.syntax, [initial_item]);
		let dfa:DFA = [{closure: initial_set, edge: new Map<Token, number>()}];

		// 変更がなくなるまでループ
		let flg_changed = true;
		console.log("start generate dfa");
		let i=0;
		while(flg_changed){
			flg_changed = false;
			//for(let [index, {closure, edge}] of dfa.entries()){
			while(i<dfa.length){
				let closure = dfa[i].closure;
				let edge = dfa[i].edge;
				let new_sets:Map<Token, Array<ClosureItem>> = new Map<Token, Array<ClosureItem>>();

				// 規則から新しい規則を生成し、対応する記号ごとにまとめる
				for(let {syntax_id, dot_index, lookaheads} of closure.getArray()){
					let {ltoken, pattern} = this.syntax.get(syntax_id);
					if(dot_index == pattern.length) continue; // .が末尾にある場合はスキップ
					let new_ci = new ClosureItem(this.syntax, syntax_id, dot_index+1, lookaheads);
					let edge_label:Token = pattern[dot_index];

					let items:Array<ClosureItem>;
					if(new_sets.has(edge_label)){
						// 既に同じ記号が登録されている
						items = new_sets.get(edge_label)!;
					}
					else{
						// 同じ記号が登録されていない
						items = [];
					}
					items.push(new_ci);
					new_sets.set(edge_label, items);
				}
				// 新しいノードを生成する
				for(let [edge_label, items] of new_sets){
					let new_node:DFANode = {closure: new ClosureSet(this.syntax, items), edge: new Map<Token, number>()};
					// 既存のNodeのなかに同一のClosureSetを持つものがないか調べる
					let duplicated_index = -1;
					for(let [i,node] of dfa.entries()){
						if(new_node.closure.isSameLR1(node.closure)){
							duplicated_index = i;
							break;
						}
					}
					let index_to;
					if(duplicated_index == -1){
						// 既存の状態と重複しない
						dfa.push(new_node);
						index_to = dfa.length-1;
						flg_changed = true;
					}
					else{
						// 既存の状態と規則が重複する
						// 新しい状態の追加は行わず、重複する既存ノードに対して辺を張る
						index_to = duplicated_index;
					}
					// 辺を追加する
					let edge_size_prev = edge.size;
					edge.set(edge_label, index_to);
					if(edge.size != edge_size_prev){
						// 新しい辺が追加された
						flg_changed = true;
						// DFAを更新
						dfa[i] = {closure: closure, edge: edge};
					}
				}
				i++;
			}
			i = 0;
		}
		this.lr_dfa = dfa;
		//this.lalr_dfa = margeLA(dfa.slice());
		this.lalr_dfa = dfa.slice();

	}

	// UNDONE
	/*
	// LR(1)オートマトンの先読み部分をマージして、LALR(1)オートマトンを作る
	private mergeLA(dfa:DFA): DFA{
		let array: Array<DFANode|null> = dfa; // nullを許容する
		let merge_to: Map<number, number> = new Map<number, number>(); // マージ先への対応関係を保持する
	}
	*/

	/*
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
	*/
}

