import {Language, LexRule} from "../def/language";
import {SYMBOL_EOF, TokenizedInput} from "../def/token";
import {LexController} from "./lexcontroller";

/**
 * 字句解析器用のinterface
 *
 * TODO: 要改善
 */
export interface ILexer {
	exec(input: string): Array<TokenizedInput>;
}

/**
 * 字句解析器
 * 入力を受け取ってトークン化する
 */
export class Lexer implements ILexer {
	constructor(private language: Language) {
		// do nothing
	}
	exec(input: string): Array<TokenizedInput> {
		const result: Array<TokenizedInput> = [];
		let next_index = 0;
		const controller = new LexController(this.language);
		controller.onBegin();
		while (next_index < input.length) {
			// 念の為undefined対策
			// const current_rules = this.rules.has(controller.getCurrentState()) ? this.rules.get(controller.getCurrentState())! : [];
			const current_rules = controller.getRulesItr();
			const {rule, matched} = Lexer.match(current_rules, input, next_index);
			if (rule === null) {
				// マッチする規則がなかった
				throw new Error("no pattern matched");
			}
			else {
				let token = rule.token;
				let value = matched;
				// コールバック呼び出し
				if (typeof rule.token !== "symbol" && rule.callback !== undefined) {
					const callback_result = rule.callback(matched, rule.token, controller);
					if (callback_result === null) {
						token = null;
					}
					else if (typeof callback_result === "string") {
						token = callback_result;
					}
					else if (Array.isArray(callback_result)) {
						token = callback_result[0];
						value = callback_result[1];
					}
					else if (callback_result !== undefined) {
						token = callback_result.token;
						value = callback_result.value;
					}
					// callback_result === undefinedなら何もしない
				}
				// tokenがnullなら処理を飛ばす
				if (token !== null) {
					result.push({token: token, value: value});
				}
				// 読む位置を進める
				next_index += matched.length;
			}
		}
		result.push({token: SYMBOL_EOF, value: ""});
		controller.onEnd();
		return result;
	}
	private static match(rules: Iterable<LexRule>, input: string, next_index: number): { rule: LexRule | null, matched: string } {
		let result_matched: string = "";
		let result_rule: LexRule | null = null;
		let result_priority: number | null = null;
		for (const rule of rules) {
			let match = "";
			if (typeof rule.pattern === "string") {
				const tmp_next_index = next_index + rule.pattern.length;
				if (input.substring(next_index, tmp_next_index) != rule.pattern) continue; // マッチしない
				// マッチした文字列の末尾が\wで、その直後の文字が\wの場合はスキップ
				if (tmp_next_index < input.length && /\w/.test(rule.pattern.substring(0, 1)) && /\w/.test(input[tmp_next_index])) continue;
				match = rule.pattern;
			}
			else {
				// pattern: RegExp
				rule.pattern.lastIndex = next_index;
				const m = rule.pattern.exec(input);
				if (m === null) continue; // マッチ失敗
				match = m[0];
			}
			// 同じ優先度の場合、最長マッチまたは出現順(match_priorityで設定)
			const priority = rule.priority !== undefined ? rule.priority : 0;
			if (result_priority === null ||
				priority > result_priority ||
				priority === result_priority && match.length > result_matched.length) {
				result_matched = match;
				result_rule = rule;
				result_priority = priority;
			}
		}
		return {rule: result_rule, matched: result_matched};
	}
}
