import {LexDefinitions} from "../def/grammar";
import {SYMBOL_EOF, Token, TokenList} from "../def/token";

export interface ILexer {
	exec(str: string): TokenList;
}

export class Lexer implements ILexer {
	constructor(public def: LexDefinitions) {
		// 正しいトークン定義が与えられているかチェック
		for (let i = 0; i < this.def.length; i++) {
			const token_pattern = this.def[i].pattern;
			if (typeof token_pattern == "string") {
				continue;
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
				// フラグをつけなおして新しい正規表現オブジェクトにする
				this.def[i].pattern = new RegExp(token_pattern, flags);
				continue;
			}
			throw new Error("invalid token definition: neither string nor RegExp object");
		}
	}
	exec(str: string): TokenList {
		const result: TokenList = [];
		let lastindex = 0;
		while (lastindex < str.length) {
			for (let i = 0; i < this.def.length; i++) {
				const token: Token | null = this.def[i].token;
				const token_pattern = this.def[i].pattern;
				let match: string;
				if (typeof token_pattern == "string") {
					const last_tmp = lastindex + token_pattern.length;
					if (str.substring(lastindex, last_tmp) != token_pattern) continue;
					if (last_tmp < str.length && /\w/.test(token_pattern.slice(-1)) && /\w/.test(str[last_tmp])) continue; // ヒットした文字の末尾が\wで、そのすぐ後ろが\wの場合はスキップ
					match = token_pattern;
					lastindex += token_pattern.length;
				}
				else {
					// token_pattern: RegExp
					token_pattern.lastIndex = lastindex;
					const m = token_pattern.exec(str);
					if (m === null) continue; // マッチ失敗
					match = m[0];
					lastindex = token_pattern.lastIndex; // lastindexを進める
				}
				// tokenがnullなら処理を飛ばします
				if (token != null) {
					result.push({token, value: match});
				}
				break;
			}
		}
		// 最後にEOFトークンを付与
		result.push({token: SYMBOL_EOF, value: ""});
		return result;
	}
}
