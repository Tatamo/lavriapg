import {default_lex_state, Language, LexCallback, LexDefinition, LexRule, LexState, LexStateLabel} from "../def/language";
import {SYMBOL_EOF, Token, TokenizedInput} from "../def/token";
import {CallbackController} from "../parser/callback";

/**
 * 字句解析器用のinterface
 *
 * TODO: 要改善
 */
export interface ILexer {
	exec(input: string): Array<TokenizedInput>;

	setCallbackController(cc: CallbackController): void;
}

/**
 * 字句解析器
 * 入力を受け取ってトークン化する
 */

export class Lexer implements ILexer {
	private rules: Map<LexStateLabel, Array<LexRule>>;
	private states: Map<LexStateLabel, LexState>;
	private lex: LexDefinition;
	setCallbackController(cc: CallbackController) {
		return;
	}
	constructor(language: Language) {
		this.lex = language.lex;
		// initialize lex states map
		this.states = new Map();
		this.states.set(default_lex_state, {label: default_lex_state, exclusive: false});
		if (this.lex.states !== undefined) {
			for (const {label, exclusive} of this.lex.states) {
				this.states.set(label, {label, exclusive: exclusive !== undefined ? exclusive : false});
			}
		}

		// initialize lex rules
		this.rules = new Map();
		for (const _rule of this.lex.rules) {
			// clone rule
			const rule = {..._rule};
			// 正規表現を字句解析に適した形に整形
			if (rule.pattern instanceof RegExp) {
				rule.pattern = Lexer.ReformatRegExp(rule.pattern);
			}
			// 状態ごとに登録
			const states: Array<LexStateLabel> = rule.state !== undefined ? rule.state : [default_lex_state];
			this.rules.set(default_lex_state, []);
			for (const state of states) {
				if (!this.rules.has(state)) this.rules.set(state, []);
				this.rules.get(state)!.push(rule);
				// not exclusiveならデフォルト状態にも登録
				if (state !== default_lex_state && !this.states.get(state)!.exclusive) {
					this.rules.get(default_lex_state)!.push(rule);
				}
			}
		}
	}
	exec(input: string): Array<TokenizedInput> {
		const result: Array<TokenizedInput> = [];
		let next_index = 0;
		// 一応const
		const lex_state = default_lex_state;
		while (next_index < input.length) {
			// 念の為undefined対策
			const current_rules = this.rules.has(lex_state) ? this.rules.get(lex_state)! : [];
			let result_match: string = "";
			let result_rule: LexRule | null = null;
			let result_priority: number | null = null;
			for (const rule of current_rules) {
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
					priority === result_priority && match.length > result_match.length) {
					result_match = match;
					result_rule = rule;
					result_priority = priority;
				}
			}
			if (result_rule === null) {
				// マッチする規則がなかった
				throw new Error("no pattern matched");
			}
			else {
				// コールバック呼び出し
				if (typeof result_rule.token !== "symbol" && result_rule.callback !== undefined) {
					result_rule.callback(result_match, result_rule.token, this);
				}
				// tokenがnullなら処理を飛ばす
				if (result_rule.token !== null) {
					result.push({token: result_rule.token, value: result_match});
				}
				// 読む位置を進める
				next_index += result_match.length;
			}
		}
		result.push({token: SYMBOL_EOF, value: ""});
		return result;
	}
	private static ReformatRegExp(pattern: RegExp): RegExp {
		// フラグを整形する
		let flags: string = "";
		// gフラグは邪魔なので取り除く
		// i,m,uフラグがあれば維持する
		if (pattern.ignoreCase) {
			flags += "i";
		}
		if (pattern.multiline) {
			flags += "m";
		}
		if (pattern.unicode) {
			flags += "u";
		}
		// yフラグは必ずつける
		flags += "y";
		return new RegExp(pattern, flags);
	}
}

