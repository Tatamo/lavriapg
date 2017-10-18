import {LexDefinitions, LexDefinitionSection} from "../def/grammar";
import {SYMBOL_EOF, Token, TokenList} from "../def/token";

export interface ILexer {
	exec(str: string): TokenList;
}

export class Lexer implements ILexer {
	private _rule_id: number;
	private def: Array<{ id: number, rule: LexDefinitionSection }>;
	constructor(def: LexDefinitions) {
		this.def = [];
		this._rule_id = 0;
		for (const rule of def) {
			this.add(rule);
		}
	}
	exec(str: string): TokenList {
		const result: TokenList = [];
		let last_index = 0;
		while (last_index < str.length) {
			let flg_matched = false;
			let result_token: Token | null = null;
			let result_match: string = "";
			let result_priority: number | null = null;
			let next_index: number;
			for (const {rule} of this.def) {
				const {token, pattern, priority} = rule;
				let match: string;
				let tmp_next_index: number;
				if (typeof pattern === "string") {
					match = pattern;
					tmp_next_index = last_index + pattern.length;
					if (str.substring(last_index, tmp_next_index) != pattern) continue; // マッチしない
					if (tmp_next_index < str.length && /\w/.test(pattern.slice(-1)) && /\w/.test(str[tmp_next_index])) continue; // マッチした文字列の末尾が\wで、その直後の文字が\wの場合はスキップ
					flg_matched = true;
				}
				else {
					// pattern: RegExp
					pattern.lastIndex = last_index;
					const m = pattern.exec(str);
					if (m === null) continue; // マッチ失敗
					flg_matched = true;
					match = m[0];
					tmp_next_index = pattern.lastIndex;
				}
				// 同じ優先度の場合、最長マッチまたは出現順(match_priorityで設定)
				const _priority = priority !== undefined ? priority : 0;
				if (result_priority === null ||
					_priority > result_priority ||
					_priority == result_priority && match.length > result_match.length) {
					result_token = token;
					result_match = match;
					result_priority = _priority;
					next_index = tmp_next_index;
				}
			}
			if (flg_matched) {
				// tokenがnullなら処理を飛ばす
				if (result_token !== null) {
					// 結果に追加
					result.push({token: result_token, value: result_match});
				}
				// 読む位置を進める
				last_index = next_index!;
			}
			else {
				// マッチする規則がなかった
				throw new Error("no pattern matched");
			}
		}
		// 最後にEOFトークンを付与
		result.push({token: SYMBOL_EOF, value: ""});
		return result;
	}
	// 字句規則を追加し、そのidを返す
	add(rule: LexDefinitionSection): number {
		const id = this._rule_id++;
		const token_pattern = rule.pattern;
		// 正しいトークン定義が与えられているかチェック
		if (typeof token_pattern === "string") {
			this.def.push({id, rule});
		}
		else if (token_pattern instanceof RegExp) {
			// フラグを整形する
			let flags: string = "";
			// gフラグは邪魔なので取り除く
			// i,m,uフラグがあれば維持する
			if (token_pattern.ignoreCase) {
				flags += "i";
			}
			if (token_pattern.multiline) {
				flags += "m";
			}
			if (token_pattern.unicode) {
				flags += "u";
			}
			// yフラグは必ずつける
			flags += "y";
			this.def.push({
				id: id,
				rule: {
					token: rule.token,
					pattern: new RegExp(token_pattern, flags),
					priority: rule.priority
				}
			});
		}
		else {
			throw new Error("invalid token definition: neither string nor RegExp object");
		}
		return id;
	}
	// 字句規則を削除する
	del(id: number): LexDefinitionSection {
		for (let i = 0; i < this.def.length; i++) {
			if (this.def[i].id === id) {
				return this.def.splice(i, 1)[0].rule;
			}
		}
		throw new Error("definition not found");
	}
}
