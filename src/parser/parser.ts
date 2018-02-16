import {GrammarDefinition} from "../def/language";
import {ParsingTable} from "../def/parsingtable";
import {Token, TokenizedInput} from "../def/token";
import {ILexer} from "../lexer/lexer";
import {CallbackController} from "./callback";

/**
 * 構文解析器
 */
export class Parser {
	private callback_controller: CallbackController;

	/**
	 * @param {ILexer} lexer 字句解析の際に使用する字句解析器
	 * @param {GrammarDefinition} grammar 解析する構文定義
	 * @param {ParsingTable} parsingtable 解析する構文解析表
	 */
	constructor(private lexer: ILexer, private grammar: GrammarDefinition, private parsingtable: ParsingTable) {
	}

	/**
	 * 使用するコールバックコントローラーを設定する
	 * @param {CallbackController} cc 構文解析時に使用されるコントローラー
	 */
	public setCallbackController(cc: CallbackController) {
		this.callback_controller = cc;
		this.lexer.setCallbackController(cc);
	}

	/**
	 * 構文解析を実行する
	 * @param {string} input 解析する入力文字列
	 * @returns {any} 解析結果(返る結果はコントローラによって異なる)
	 */
	public parse(input: string): any {
		return this._parse(this.lexer.exec(input));
	}

	// parsingtableはconflictを含む以外は正しさが保証されているものと仮定する
	// inputsは正しくないトークンが与えられる可能性を含む
	// TODO: 詳細な例外処理、エラー検知
	private _parse(inputs: Array<TokenizedInput>): any {
		let read_index: number = 0; // 次に読むべき入力記号のインデックス
		const inputs_length: number = inputs.length;
		const state_stack: Array<number> = [0]; // 現在読んでいる構文解析表の状態番号を置くスタック
		const result_stack: Array<any> = []; // 解析中のASTノードを置くスタック
		let flg_error: boolean = false;

		// 構文解析する
		while (read_index < inputs_length) {
			let token: Token = inputs[read_index].token;
			let state: number = state_stack[state_stack.length - 1];
			if (!this.parsingtable[state].has(token)) {
				// 未定義
				console.error("parse failed: unexpected token:", token);
				flg_error = true;
				break;
			}
			let action = this.parsingtable[state].get(token)!;
			if (action.type == "shift") {
				// shiftオペレーション
				// 次の状態をスタックに追加
				state_stack.push(action.to);

				result_stack.push(inputs[read_index].value);

				// 入力を一つ消費
				read_index += 1;
			}
			else if (action.type == "reduce") {
				// reduceオペレーション
				const grammar_rule = this.grammar.rules[action.grammar_id];
				const rnum = grammar_rule.pattern.length;
				// 対応する規則の右辺の記号の数だけスタックからポップする
				for (let i = 0; i < rnum; i++) state_stack.pop();

				// rnumが0でないなら、右辺の記号の数だけスタックからポップする
				const children = [];
				for (let i = 0; i < rnum; i++) children[rnum - 1 - i] = result_stack.pop();

				if (this.callback_controller !== undefined) {
					result_stack.push(this.callback_controller.callGrammar(action.grammar_id, children, this.lexer));
				}
				else {
					result_stack.push(children[0]);
				}

				// このままgotoオペレーションを行う
				state = state_stack[state_stack.length - 1];
				token = grammar_rule.ltoken;
				if (!this.parsingtable[state].has(token)) {
					// 未定義
					console.error("parse failed: unexpected token:", token);
					flg_error = true;
					break;
				}
				action = this.parsingtable[state].get(token)!;
				if (action.type != "goto") {
					// gotoアクションでなければおかしい
					console.error("parse failed: goto operation expected after reduce operation");
					flg_error = true;
					break;
				}
				state_stack.push(action.to);
			}
			else if (action.type == "accept") {
				// 構文解析完了
				break;
			}
			else if (action.type == "conflict") {
				console.error("conflict found:");
				console.error("current state " + state + ":", JSON.stringify(this.parsingtable[state]));
				console.error("shift:", action.shift_to, ",reduce:", action.reduce_grammar);
				action.shift_to.forEach((to: number) => {
					console.error("shift to " + to.toString() + ":", JSON.stringify(this.parsingtable[to]));
				});
				action.reduce_grammar.forEach((grammar_id: number) => {
					console.error("reduce grammar " + grammar_id.toString() + ":", JSON.stringify(this.parsingtable[grammar_id]));
				});
				console.error("parser cannot parse conflicted grammar");
				flg_error = true;
				break;
			}
		}
		if (flg_error) {
			console.error("parse failed.");
		}
		if (result_stack.length != 1) {
			console.error("failed to construct tree.");
		}
		return result_stack[0];
	}
}
