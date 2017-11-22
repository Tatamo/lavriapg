import {GrammarDefinition} from "../def/language";
import {Token} from "../def/token";

/**
 * ある非終端記号から空列が導かれうるかどうかを判定する
 */
export class NullableSet {
	private nulls: Set<Token>;
	/**
	 * @param {GrammarDefinition} grammar 構文規則
	 */
	constructor(private grammar: GrammarDefinition) {
		this.generateNulls();
	}
	private generateNulls() {
		// 制約条件を導出するために、
		// 空列になりうる記号の集合nullsを導出
		this.nulls = new Set<Token>();
		for (const rule of this.grammar) {
			// 右辺の記号の数が0の規則を持つ記号は空列になりうる
			if (rule.pattern.length == 0) {
				this.nulls.add(rule.ltoken);
			}
		}

		// 変更が起きなくなるまでループする
		let flg_changed: boolean = true;
		while (flg_changed) {
			flg_changed = false;
			for (const rule of this.grammar) {
				// 既にnullsに含まれていればスキップ
				if (this.isNullable(rule.ltoken)) continue;

				let flg_nulls = true;
				// 右辺に含まれる記号がすべてnullableの場合はその左辺はnullable
				for (const token of rule.pattern) {
					if (!this.isNullable(token)) {
						// 一つでもnullableでない記号があるならnon-nullable
						flg_nulls = false;
						break;
					}
				}
				if (flg_nulls) {
					flg_changed = true;
					this.nulls.add(rule.ltoken);
				}
			}
		}
	}
	/**
	 * 与えられた[[Token]]がNullableかどうかを調べる
	 * @param {Token} token
	 * @returns {boolean}
	 */
	public isNullable(token: Token) {
		return this.nulls.has(token);
	}
}
