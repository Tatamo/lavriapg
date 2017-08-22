import {SYMBOL_EOF, Token} from "../def/token";
import {ClosureItem} from "./closureitem";
import {ClosureSet} from "./closureset";
import {SyntaxDB} from "./syntaxdb";

export type DFAEdge = Map<Token, number>;
export type DFANode = { closure: ClosureSet, edge: DFAEdge };
export type DFA = Array<DFANode>;

export class DFAGenerator {
	private lr_dfa: DFA;
	private lalr_dfa: DFA;
	constructor(private syntax: SyntaxDB) {
		this.generateDFA();
	}
	public getLR1DFA(): DFA {
		return this.lr_dfa;
	}
	public getLALR1DFA(): DFA {
		return this.lalr_dfa;
	}
	// DFAの生成
	private generateDFA() {
		const initial_item: ClosureItem = new ClosureItem(this.syntax, -1, 0, [SYMBOL_EOF]);
		const initial_set: ClosureSet = new ClosureSet(this.syntax, [initial_item]);
		const dfa: DFA = [{closure: initial_set, edge: new Map<Token, number>()}];

		// 変更がなくなるまでループ
		let flg_changed = true;
		let i = 0;
		while (flg_changed) {
			flg_changed = false;
			while (i < dfa.length) {
				const closure = dfa[i].closure;
				const edge = dfa[i].edge;
				const new_sets: Map<Token, ClosureSet> = this.generateNewClosureSets(closure);

				// 新しいノードを生成する
				for (const [edge_label, cs] of new_sets) {
					const new_node: DFANode = {closure: cs, edge: new Map<Token, number>()};
					// 既存のNodeのなかに同一のClosureSetを持つものがないか調べる
					const duplicated_index = this.indexOfDuplicatedNode(dfa, new_node);
					let index_to;
					if (duplicated_index == -1) {
						// 既存の状態と重複しない
						dfa.push(new_node);
						index_to = dfa.length - 1;
						flg_changed = true;
					}
					else {
						// 既存の状態と規則が重複する
						// 新しいノードの追加は行わず、重複する既存ノードに対して辺を張る
						index_to = duplicated_index;
					}
					// 辺を追加する
					if (!edge.has(edge_label)) {
						edge.set(edge_label, index_to);
						// 新しい辺が追加された
						flg_changed = true;
						// DFAを更新
						dfa[i] = {closure, edge};
					}
				}
				i++;
			}
			i = 0;
		}
		this.lr_dfa = dfa;
		this.lalr_dfa = this.mergeLA(dfa);
	}
	// TODO: バグがないか確認
	// LR(1)オートマトンの先読み部分をマージして、LALR(1)オートマトンを作る
	private mergeLA(dfa: DFA): DFA {
		const array: Array<DFANode | null> = dfa.slice(); // nullを許容する
		const merge_to: Map<number, number> = new Map<number, number>(); // マージ先への対応関係を保持する

		for (let i = 0; i < array.length; i++) {
			if (array[i] == null) continue;
			for (let ii = i + 1; ii < array.length; ii++) {
				if (array[ii] == null) continue;
				// LR(0)アイテムセット部分が重複
				if (array[i]!.closure.isSameLR0(array[ii]!.closure)) {
					// ii番目の先読み部分をi番目にマージする
					// インデックス番号の大きい方が削除される
					// 辺情報は、対象となる辺もいずれマージされて消えるため操作しなくてよい

					// 更新
					// Nodeに変更をかけるとLR(1)DFAの中身まで変化してしまうため新しいオブジェクトとする
					array[i] = {closure: array[i]!.closure.mergeLA(array[ii]!.closure)!, edge: array[i]!.edge};
					// ii番目を削除
					array[ii] = null;
					// マージ元->マージ先への対応関係を保持
					merge_to.set(ii, i);
				}
			}
		}
		// 削除した部分を配列から抜き取る
		const prev_length = array.length; // ノードをマージする前のノード総数
		const fix = new Array(prev_length); // (元のindex->現在のindex)の対応表を作る
		let d = 0; // ずれ
		// nullで埋めた部分を消すことによるindexの変化
		for (let i = 0; i < prev_length; i++) {
			if (array[i] === null) d += 1; // ノードが削除されていた場合、以降のインデックスを1つずらす
			else fix[i] = i - d;
		}
		// 配列からnull埋めした部分を削除したものを作る
		const shortened: Array<DFANode> = [];
		for (const node of array) {
			if (node !== null) shortened.push(node);
		}
		// fixのノードが削除された部分を埋める
		for (const [from, to] of merge_to) {
			let index = to;
			while (merge_to.has(index)) index = merge_to.get(index)!;
			fix[from] = fix[index]; // toを繰り返し辿っているので未定義部分へのアクセスは発生しない
		}

		const result: DFA = [];
		// インデックスの対応表をもとに辺情報を書き換える
		for (const node of shortened) {
			const new_edge = new Map<Token, number>();
			for (const [token, node_index] of node.edge) {
				new_edge.set(token, fix[node_index]);
			}
			result.push({closure: node.closure, edge: new_edge});
		}
		return result;
	}
	// 既存のClosureSetから新しい規則を生成し、対応する記号ごとにまとめる
	private generateNewClosureSets(closureset: ClosureSet): Map<Token, ClosureSet> {
		const tmp: Map<Token, Array<ClosureItem>> = new Map<Token, Array<ClosureItem>>();
		// 規則から新しい規則を生成し、対応する記号ごとにまとめる
		for (const {syntax_id, dot_index, lookaheads} of closureset.getArray()) {
			const pattern = this.syntax.getDefinitionById(syntax_id).pattern;
			if (dot_index == pattern.length) continue; // .が末尾にある場合はスキップ
			const new_ci = new ClosureItem(this.syntax, syntax_id, dot_index + 1, lookaheads);
			const edge_label: Token = pattern[dot_index];

			let items: Array<ClosureItem>;
			if (tmp.has(edge_label)) {
				// 既に同じ記号が登録されている
				items = tmp.get(edge_label)!;
			}
			else {
				// 同じ記号が登録されていない
				items = [];
			}
			items.push(new_ci);
			tmp.set(edge_label, items);
		}
		// ClosureItemの配列からClosureSetに変換
		const result: Map<Token, ClosureSet> = new Map<Token, ClosureSet>();
		for (const [edge_label, items] of tmp) {
			result.set(edge_label, new ClosureSet(this.syntax, items));
		}
		return result;
	}
	// 与えられたDFANodeと全く同じDFANodeがある場合、そのindexを返す
	// 見つからなければ-1を返す
	private indexOfDuplicatedNode(dfa: DFA, new_node: DFANode): number {
		let index = -1;
		for (const [i, node] of dfa.entries()) {
			if (new_node.closure.isSameLR1(node.closure)) {
				index = i;
				break;
			}
		}
		return index;
	}
}
