import {LexCallback, LexDefinition, LexRule} from "../def/language";
import {SYMBOL_EOF, Token, TokenizedInput} from "../def/token";
import {CallbackController} from "../parser/callback";

/**
 * 字句解析器用のinterface
 *
 * TODO: 要改善
 */
export interface ILexer {
	exec(str: string): Array<TokenizedInput>;

	setCallbackController(cc: CallbackController): void;
}

/**
 * 字句解析器
 * 入力を受け取ってトークン化する
 */
export class Lexer implements ILexer {
	private _rule_id: number;
	private _def: Array<{ id: number, rule: LexRule }>;
	private _reset: { def: Array<{ id: number, rule: LexRule }>, id: number, flg_modified: boolean };
	private _input: string;
	private _next_index: number;
	/**
	 * 次に読み込む入力の位置
	 */
	get next_index(): number {
		return this._next_index;
	}

	private _status: "uninitialized" | "ready" | "finished";
	/**
	 * 字句解析器の内部状態を取得する
	 * @returns {"uninitialized" | "ready" | "finished"}
	 */
	get status(): "uninitialized" | "ready" | "finished" {
		return this._status;
	}

	private callback_controller: CallbackController;

	/**
	 * @param {LexDefinition} def 解析する入力の字句規則
	 * @param {string} input 解析したい入力
	 */
	constructor(def: LexDefinition, input?: string) {
		this._def = [];
		this._rule_id = 0;
		for (const rule of def.rules) {
			this.add(rule);
		}
		this.setCurrentDefinitionAsDefault();
		this.reset(input);
	}

	/**
	 * 入力を解析する際に呼び出すコールバックコントローラーを設定する
	 * @param {CallbackController} cc 使用されるべきコールバックコントローラー
	 */
	public setCallbackController(cc: CallbackController) {
		this.callback_controller = cc;
	}

	/**
	 * 字句解析機のリセット時に現在の字句規則になるようにする
	 */
	setCurrentDefinitionAsDefault() {
		this._reset = {
			def: this._def.slice(),
			id: this._rule_id,
			flg_modified: false
		};
	}

	/**
	 * Lexerの内部状態をコンストラクタ呼び出し直後まで戻す
	 */
	reset(input?: string) {
		if (this._reset.flg_modified) {
			this._def = this._reset.def.slice();
			this._rule_id = this._reset.id;
			this._reset.flg_modified = false;
		}
		this._next_index = 0;
		this._status = "uninitialized";
		if (input !== undefined) this.init(input);
	}

	/**
	 * 入力を与えて解析可能(step()を呼び出し可能)な状態にする
	 * @param {string} input 解析する入力
	 */
	init(input: string) {
		this._input = input;
		this._next_index = 0;
		this._status = "ready";
	}

	/**
	 * 入力からトークン1つ分読み込む
	 * @returns {TokenizedInput} トークン化された入力
	 */
	step(): TokenizedInput {
		if (this.status !== "ready") {
			throw new Error("Lexer is not ready");
		}
		while (true) {
			if (this._next_index >= this._input.length) {
				// 解析終了
				this._next_index = this._input.length;
				this._status = "finished";
				// 最後にEOFトークンを付与
				return {token: SYMBOL_EOF, value: ""};
			}
			let flg_matched = false;
			let result_token: Token | null = null;
			let result_match: string = "";
			let result_priority: number | null = null;
			let next_index: number;
			let result_callback: LexCallback | undefined;
			let result_id: number = -1;
			for (const {id, rule} of this._def) {
				const {token, pattern, priority, callback} = rule;
				let match: string;
				let tmp_next_index: number;
				if (typeof pattern === "string") {
					match = pattern;
					tmp_next_index = this._next_index + pattern.length;
					if (this._input.substring(this._next_index, tmp_next_index) != pattern) continue; // マッチしない
					if (tmp_next_index < this._input.length && /\w/.test(pattern.slice(-1)) && /\w/.test(this._input[tmp_next_index])) continue; // マッチした文字列の末尾が\wで、その直後の文字が\wの場合はスキップ
					flg_matched = true;
				}
				else {
					// pattern: RegExp
					pattern.lastIndex = this._next_index;
					const m = pattern.exec(this._input);
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
					result_callback = callback;
					result_id = id;
				}
			}
			if (flg_matched) {
				// 読む位置を進める
				this._next_index = next_index!;
				// コールバック呼び出し
				if (typeof result_token !== "symbol") {
					if (this.callback_controller !== undefined) {
						if (result_token !== null) {
							return {token: result_token, value: this.callback_controller.callLex(result_id, result_match, this)};
						}
						else {
							this.callback_controller.callLex(result_id, result_match, this);
						}
					}
					// CallbackControllerが定義されていないならそのままコールバックを呼び出す(暫定)
					else if (result_callback !== undefined) {
						if (result_token !== null) {
							return {token: result_token, value: result_callback(result_match, result_token, this)};
						}
						else {
							result_callback(result_match, result_token, this);
						}
					}
				}
				// tokenがnullなら処理を飛ばす
				if (result_token !== null) {
					return {token: result_token, value: result_match};
				}
			}
			else {
				// マッチする規則がなかった
				throw new Error("no pattern matched");
			}
		}
	}

	/**
	 * 与えられた入力をすべて解析し、トークン列を返す
	 * @param {string} input 解析する入力
	 * @returns {Array<TokenizedInput>} 入力から生成されたトークン列
	 */
	exec(input?: string): Array<TokenizedInput> {
		if (this.status === "finished" || this.status === "ready" && this.next_index > 0) {
			this.reset(input);
		}
		else if (input !== undefined) {
			this.init(input);
		}
		const result: Array<TokenizedInput> = [];
		while (this.status !== "finished") {
			result.push(this.step());
		}
		return result;
	}

	/**
	 * 字句規則を追加し、そのidを返す
	 * @param {LexRule} rule 新しく追加するルール
	 * @returns {number} 追加されたルールの持つid
	 */
	add(rule: LexRule): number {
		const id = this._rule_id++;
		const token_pattern = rule.pattern;
		// 正しいトークン定義が与えられているかチェック
		if (typeof token_pattern === "string") {
			this._def.push({id, rule});
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
			this._def.push({
				id: id,
				rule: {
					token: rule.token,
					pattern: new RegExp(token_pattern, flags),
					priority: rule.priority,
					callback: rule.callback
				}
			});
		}
		else {
			throw new Error("invalid token definition: neither string nor RegExp object");
		}
		if (this._reset !== undefined) this._reset.flg_modified = true;
		return id;
	}

	/**
	 * 字句規則を削除する
	 * 削除に失敗した場合は例外をスローする
	 *
	 * TODO: もっとましな実装にする
	 * @param {number} id 削除するルールのid
	 * @returns {LexRule} 削除されたルール
	 */
	del(id: number): LexRule {
		for (let i = 0; i < this._def.length; i++) {
			if (this._def[i].id === id) {
				this._reset.flg_modified = true;
				return this._def.splice(i, 1)[0].rule;
			}
		}
		throw new Error("definition not found");
	}
}
