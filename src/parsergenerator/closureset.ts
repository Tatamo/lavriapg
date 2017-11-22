import {Token} from "../def/token";
import {ClosureItem} from "./closureitem";
import {GrammarDB} from "./grammardb";

/**
 * 複数のLRアイテムを保持するアイテム集合であり、インスタンス生成時に自身をクロージャー展開する
 *
 * [[GrammarDB]]から与えられるトークンIDをもとにして、LR(0)およびLR(1)アイテム集合としてのハッシュ値を生成することができる
 *
 * Immutableであるべきオブジェクトであるため、インスタンス生成後は内部状態が変化することはないと仮定される
 */
export class ClosureSet {
	// インスタンス生成後に内部状態が変化することはないものとする
	private _lr0_hash: string;
	private _lr1_hash: string;
	/**
	 * @param {GrammarDB} grammardb 使用する構文の情報
	 * @param {Array<ClosureItem>} closureset
	 */
	constructor(private grammardb: GrammarDB, private closureset: Array<ClosureItem>) {
		this.expandClosure();
		this.sort();
		this.updateHash();
	}
	/**
	 * 自身が保持する複数の[[ClosureItem]]は、常にLR(1)ハッシュによってソートされた状態に保たれているようにする
	 */
	private sort() {
		this.closureset.sort((i1: ClosureItem, i2: ClosureItem) => {
			if (i1.getLR1Hash() < i2.getLR1Hash()) return -1;
			else if (i1.getLR1Hash() > i2.getLR1Hash()) return 1;
			return 0;
		});
	}
	/**
	 * 保持しているLRアイテムの数
	 */
	get size() {
		return this.closureset.length;
	}
	/**
	 * 保持している[[ClosureItem]]の配列を得る
	 * @param {boolean} prevent_copy trueを与えると配列をコピーせず返す
	 *
	 * 得られた配列に変更が加えられないと保証される場合に用いる
	 * @returns {Array<ClosureItem>}
	 */
	public getArray(prevent_copy: boolean = false): Array<ClosureItem> {
		if (prevent_copy) return this.closureset;
		// デフォルトではコピーして返す(パフォーマンスは少し落ちる)
		return this.closureset.concat();
	}
	/**
	 * LRアイテムが集合に含まれているかどうかを調べる
	 *
	 * @param {ClosureItem} item
	 * @returns {boolean}
	 */
	public includes(item: ClosureItem): boolean {
		// 二分探索を用いて高速に探索する
		let min = 0;
		let max = this.closureset.length - 1;
		while (min <= max) {
			const mid = min + Math.floor((max - min) / 2);
			if (item.getLR1Hash() < this.closureset[mid].getLR1Hash()) {
				max = mid - 1;
			}
			else if (item.getLR1Hash() > this.closureset[mid].getLR1Hash()) {
				min = mid + 1;
			}
			else {
				// itemとclosureset[mid]が等しい
				return true;
			}
		}
		return false;
	}
	/**
	 * LR(0)ハッシュの一致を調べる
	 * @param {ClosureSet} cs 比較対象のアイテム集合
	 * @returns {boolean}
	 */
	public isSameLR0(cs: ClosureSet): boolean {
		return this.getLR0Hash() == cs.getLR0Hash();
	}
	/**
	 * LR(1)ハッシュの一致を調べる
	 * @param {ClosureSet} cs 比較対象のアイテム集合
	 * @returns {boolean}
	 */
	public isSameLR1(cs: ClosureSet): boolean {
		return this.getLR1Hash() == cs.getLR1Hash();
	}
	/**
	 * ハッシュ文字列を生成する
	 */
	private updateHash() {
		let lr0_hash = "";
		let lr1_hash = "";
		for (let i = 0; i < this.closureset.length; i++) {
			lr0_hash += this.closureset[i].getLR0Hash();
			lr1_hash += this.closureset[i].getLR1Hash();
			if (i != this.closureset.length - 1) {
				lr0_hash += "|";
				lr1_hash += "|";
			}
		}
		this._lr0_hash = lr0_hash;
		this._lr1_hash = lr1_hash;
	}
	/**
	 * LR(0)アイテム集合としてのハッシュ文字列を得る
	 * @returns {string}
	 */
	public getLR0Hash() {
		return this._lr0_hash;
	}
	/**
	 * LR(1)アイテム集合としてのハッシュ文字列を得る
	 * @returns {string}
	 */
	public getLR1Hash() {
		return this._lr1_hash;
	}
	/**
	 * LR(0)部分が同じ2つのClosureSetについて、先読み部分を統合した新しいClosureSetを生成する
	 *
	 * 異なるLR(0)アイテム集合であった場合、nullを返す
	 * @param {ClosureSet} cs マージ対象のアイテム集合
	 * @returns {ClosureSet | null} 先読み部分がマージされた新しいアイテム集合
	 */
	public mergeLA(cs: ClosureSet): ClosureSet | null {
		// LR0部分が違っている場合はnullを返す
		if (!this.isSameLR0(cs)) return null;
		// LR1部分まで同じ場合は自身を返す
		if (this.isSameLR1(cs)) return this;
		const a1 = this.getArray();
		const a2 = cs.getArray();
		const new_set: Array<ClosureItem> = [];
		// 2つの配列においてLR部分は順序を含めて等しい
		for (let i = 0; i < a1.length; i++) {
			const new_item = a1[i].merge(a2[i]);
			if (new_item != null) new_set.push(new_item);
		}
		return new ClosureSet(this.grammardb, new_set);
	}

	/**
	 * クロージャー展開を行う
	 *
	 * TODO: リファクタリング
	 */
	private expandClosure() {
		// 展開処理中はClosureItemのlookaheadsの要素数を常に1に保つこととする
		// 初期化
		const set: Array<ClosureItem> = [];
		// ClosureItemをlookaheadsごとに分解する
		for (const ci of this.closureset) {
			for (const la of ci.lookaheads) {
				set.push(new ClosureItem(this.grammardb, ci.rule_id, ci.dot_index, [la]));
			}
		}
		this.closureset = set;
		this.sort();

		// 変更がなくなるまで繰り返す
		let index = 0;
		while (index < this.closureset.length) {
			const ci = this.closureset[index++];
			const pattern = this.grammardb.getRuleById(ci.rule_id).pattern;

			if (ci.dot_index == pattern.length) continue; // .が末尾にある場合はスキップ
			const follow = pattern[ci.dot_index];
			if (!this.grammardb.symbols.isNonterminalSymbol(follow)) continue; // .の次の記号が非終端記号でないならばスキップ

			// クロージャー展開を行う

			// 先読み記号を導出
			// ci.lookaheadsは要素数1のため、0番目のインデックスのみを参照すればよい
			const lookaheads = [...this.grammardb.first.get(pattern.slice(ci.dot_index + 1).concat(ci.lookaheads[0])).values()];
			lookaheads.sort((t1: Token, t2: Token) => {
				return this.grammardb.getTokenId(t1) - this.grammardb.getTokenId(t2);
			});

			// symbolを左辺にもつ全ての規則を、先読み記号を付与して追加
			const rules = this.grammardb.findRules(follow);
			for (const {id} of rules) {
				for (const la of lookaheads) {
					const new_ci = new ClosureItem(this.grammardb, id, 0, [la]);
					// 重複がなければ新しいアイテムを追加する
					let flg_duplicated = false;
					for (const existing_item of this.closureset) {
						if (new_ci.isSameLR1(existing_item)) {
							flg_duplicated = true;
							break;
						}
					}
					if (!flg_duplicated) {
						this.closureset.push(new_ci);
					}
				}
			}
		}
		this.sort();

		// ClosureItemの先読み部分をマージする
		const tmp = this.closureset;
		this.closureset = [];
		let merged_lookaheads = [];
		for (let i = 0; i < tmp.length; i++) {
			merged_lookaheads.push(tmp[i].lookaheads[0]);
			if (i == tmp.length - 1 || !tmp[i].isSameLR0(tmp[i + 1])) {
				this.closureset.push(new ClosureItem(this.grammardb, tmp[i].rule_id, tmp[i].dot_index, merged_lookaheads));
				merged_lookaheads = [];
			}
		}
	}
}
