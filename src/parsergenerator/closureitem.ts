import {Token} from "../def/token";
import {SyntaxDB} from "./syntaxdb";

export class ClosureItem {
	// インスタンス生成後に内部状態が変化することはないものとする
	private _lr0_hash: string;
	private _lr1_hash: string;
	constructor(private syntax: SyntaxDB, private _syntax_id: number, private _dot_index: number, private _lookaheads: Array<Token>) {
		// 有効な値かどうか調べる
		if (!this.syntax.hasDefinitionId(this._syntax_id)) {
			throw new Error("invalid syntax id");
		}
		if (this._dot_index < 0 || this._dot_index > this.syntax.getDefinitionById(this._syntax_id).pattern.length) {
			throw new Error("dot index out of range");
		}
		if (this._lookaheads.length == 0) {
			// 必要か？
			throw new Error("one or more lookahead symbols needed");
		}
		this.sortLA();
		this.updateHash();
	}
	get syntax_id(): number {
		return this._syntax_id;
	}
	get dot_index(): number {
		return this._dot_index;
	}
	get lookaheads(): Array<Token> {
		return this._lookaheads;
	}
	private sortLA() {
		this.lookaheads.sort((t1: Token, t2: Token) => {
			return this.syntax.getTokenId(t1) - this.syntax.getTokenId(t2);
		});
	}
	// ハッシュ文字列を生成する
	private updateHash() {
		this._lr0_hash = this.syntax_id.toString() + "," + this.dot_index.toString();
		let la_hash = "[";
		for (let i = 0; i < this.lookaheads.length; i++) {
			la_hash += this.syntax.getTokenId(this.lookaheads[i]).toString();
			if (i != this.lookaheads.length - 1) la_hash += ",";
		}
		la_hash += "]";
		this._lr1_hash = this._lr0_hash + "," + la_hash;
	}
	// 先読み部分を除いたハッシュ文字列を取得
	public getLR0Hash(): string {
		return this._lr0_hash;
	}
	// 先読み部分を含めたハッシュ文字列を取得
	public getLR1Hash(): string {
		return this._lr1_hash;
	}
	// 先読み部分を除いた部分が一致しているか調べる
	public isSameLR0(c: ClosureItem): boolean {
		return this.getLR0Hash() == c.getLR0Hash();
	}
	// 先読み部分も含めて完全に一致しているか調べる
	public isSameLR1(c: ClosureItem): boolean {
		return this.getLR1Hash() == c.getLR1Hash();
	}
	// LR0部分の同じ2つのClosureItemの先読み部分を統合して新しいClosureItemを生成する
	public merge(c: ClosureItem): ClosureItem | null {
		// LR0部分が違っている場合はnullを返す
		if (!this.isSameLR0(c)) return null;
		// LR1部分まで同じ場合は自身を返す
		if (this.isSameLR1(c)) return this;
		// 双方のlookaheads配列はソート済みであるとする
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
			else if (this.syntax.getTokenId(this.lookaheads[i1]) < this.syntax.getTokenId(c.lookaheads[i2])) {
				new_la.push(this.lookaheads[i1++]);
			}
			else {
				new_la.push(c.lookaheads[i2++]);
			}
		}
		return new ClosureItem(this.syntax, this.syntax_id, this.dot_index, new_la);
	}
}
