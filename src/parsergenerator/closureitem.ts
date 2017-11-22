import {Token} from "../def/token";
import {GrammarDB} from "./grammardb";

/**
 * 単一のLRアイテムであり、`S -> A . B [$]` のようなアイテムの規則id・ドットの位置・先読み記号の集合の情報を持つ
 *
 * [[GrammarDB]]から与えられるトークンIDをもとにして、LR(0)およびLR(1)アイテムとしてのハッシュ値を生成することができる
 *
 * Immutableであるべきオブジェクトであるため、インスタンス生成後は内部状態が変化することはないと仮定される
 */
export class ClosureItem {
	private _lr0_hash: string;
	private _lr1_hash: string;
	/**
	 * @param {GrammarDB} grammardb 使用する構文の情報
	 * @param {number} _rule_id 構文のid
	 * @param {number} _dot_index ドットの位置
	 * @param {Array<Token>} _lookaheads 先読み記号の集合
	 */
	constructor(private grammardb: GrammarDB, private _rule_id: number, private _dot_index: number, private _lookaheads: Array<Token>) {
		// 有効な値かどうか調べる
		if (!this.grammardb.hasRuleId(this._rule_id)) {
			throw new Error("invalid grammar id");
		}
		if (this._dot_index < 0 || this._dot_index > this.grammardb.getRuleById(this._rule_id).pattern.length) {
			throw new Error("dot index out of range");
		}
		if (this._lookaheads.length == 0) {
			// 必要か？
			throw new Error("one or more lookahead symbols needed");
		}
		this.sortLA();
		this.updateHash();
	}
	/**
	 * 自身の規則idを返す
	 *
	 * 規則idはルールの定義順に0,1,2,...と割り振られる
	 * @returns {number}
	 */
	get rule_id(): number {
		return this._rule_id;
	}
	/**
	 * 現在の読み込み位置を意味するドットの位置を返す
	 * @returns {number}
	 */
	get dot_index(): number {
		return this._dot_index;
	}
	/**
	 * LR(1)先読み記号の集合を配列として返す
	 *
	 * 配列のコピーではなく参照が返されるので、結果しとて得られた配列に変更を加えてはならない
	 * @returns {Array<Token>}
	 */
	get lookaheads(): Array<Token> {
		return this._lookaheads;
	}
	/**
	 * 先読み記号の配列を、[[GrammarDB]]によって割り振られるトークンid順にソートする
	 */
	private sortLA() {
		this.lookaheads.sort((t1: Token, t2: Token) => {
			return this.grammardb.getTokenId(t1) - this.grammardb.getTokenId(t2);
		});
	}
	/**
	 * ハッシュ文字列を生成する
	 */
	private updateHash() {
		this._lr0_hash = this.rule_id.toString() + "," + this.dot_index.toString();
		let la_hash = "[";
		for (let i = 0; i < this.lookaheads.length; i++) {
			la_hash += this.grammardb.getTokenId(this.lookaheads[i]).toString();
			if (i != this.lookaheads.length - 1) la_hash += ",";
		}
		la_hash += "]";
		this._lr1_hash = this._lr0_hash + "," + la_hash;
	}
	/**
	 * 先読み部分を除いたLR(0)アイテムとしてのハッシュ文字列を得る
	 * @returns {string}
	 */
	public getLR0Hash(): string {
		return this._lr0_hash;
	}
	/**
	 * 先読み部分を含めたLR(1)アイテムとしてのハッシュ文字列を得る
	 * @returns {string}
	 */
	public getLR1Hash(): string {
		return this._lr1_hash;
	}
	/**
	 * LR(0)ハッシュの一致を調べる
	 * @param {ClosureItem} c 比較対象のLRアイテム
	 * @returns {boolean}
	 */
	public isSameLR0(c: ClosureItem): boolean {
		return this.getLR0Hash() == c.getLR0Hash();
	}
	/**
	 * LR(1)ハッシュの一致を調べる
	 * @param {ClosureItem} c 比較対象のLRアイテム
	 * @returns {boolean}
	 */
	public isSameLR1(c: ClosureItem): boolean {
		return this.getLR1Hash() == c.getLR1Hash();
	}
	/**
	 * LR0部分を維持しながらLR1先読み記号ごとにClosureItemを分割し、先読み記号の数が1のClosureItemの集合を生成する
	 */
	public separateByLookAheads(): Array<ClosureItem> {
		// this.lookaheadsの要素数が1未満の状況は存在しない
		const result = [];
		for (const la of this.lookaheads) {
			result.push(new ClosureItem(this.grammardb, this.rule_id, this.dot_index, [la]));
		}
		return result;
	}
	/**
	 * LR0部分が同じ2つのClosureItemについて、先読み部分を統合した新しいClosureItemを生成する
	 *
	 * 異なるLR(0)アイテムであった場合、nullを返す
	 * @param {ClosureItem} c マージ対象のLRアイテム
	 * @returns {ClosureItem | null} 先読み部分がマージされた新しいLRアイテム
	 */
	public merge(c: ClosureItem): ClosureItem | null {
		// LR0部分が違っている場合はnullを返す
		if (!this.isSameLR0(c)) return null;
		// LR1部分まで同じ場合は自身を返す
		if (this.isSameLR1(c)) return this;
		// 双方のlookaheads配列はソート済みであると仮定できる
		let i1 = 0;
		let i2 = 0;
		const new_la = [];
		// 2つのLA配列をマージして新しい配列を生成する
		while (i1 < this.lookaheads.length || i2 < c.lookaheads.length) {
			if (i1 == this.lookaheads.length) {
				new_la.push(c.lookaheads[i2++]);
			}
			else if (i2 == c.lookaheads.length) {
				new_la.push(this.lookaheads[i1++]);
			}
			else if (this.lookaheads[i1] == c.lookaheads[i2]) {
				new_la.push(this.lookaheads[i1++]);
				i2++;
			}
			else if (this.grammardb.getTokenId(this.lookaheads[i1]) < this.grammardb.getTokenId(c.lookaheads[i2])) {
				new_la.push(this.lookaheads[i1++]);
			}
			else {
				new_la.push(c.lookaheads[i2++]);
			}
		}
		return new ClosureItem(this.grammardb, this.rule_id, this.dot_index, new_la);
	}
}
