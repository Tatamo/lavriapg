import {default_lex_state, Language, LexCallback, LexDefinition, LexRule, LexState, LexStateLabel} from "../def/language";
import {SYMBOL_EOF, Token, TokenizedInput} from "../def/token";

/**
 * 字句解析器用のinterface
 *
 * TODO: 要改善
 */
export interface ILexer {
	exec(input: string): Array<TokenizedInput>;
}

export class LexController {
	private _lex: LexDefinition;
	private _current_state: LexStateLabel;
	private _state_stack: Array<LexStateLabel>;
	private _temporary_rules: Map<LexStateLabel, Array<LexRule>>;
	private _updated_rules: Map<Token, LexRule>;
	constructor(language: Language, private _basic_rules: Map<LexStateLabel, Array<LexRule>>, private _states: Map<LexStateLabel, LexState>) {
		this._lex = language.lex;
		this._current_state = default_lex_state;
		this._state_stack = [];
		this._temporary_rules = new Map();
		this._updated_rules = new Map();
	}
	getRulesItr(): IterableIterator<LexRule> {
		const basic_r: Array<LexRule> = this._basic_rules.has(this._current_state) ? this._basic_rules.get(this._current_state)! : [];
		const tmp_r: Array<LexRule> = this._temporary_rules.has(this._current_state) ? this._temporary_rules.get(this._current_state)! : [];
		const itr_basic_rules = basic_r[Symbol.iterator]();
		const itr_temporary_rules = tmp_r[Symbol.iterator]();
		const itr: IterableIterator<LexRule> = {
			next: (): IteratorResult<LexRule> => {
				let next;
				while (true) {
					next = itr_basic_rules.next();
					if (next.done) next = itr_temporary_rules.next();
					// 繰り返し終了
					if (!next.done) return next;

					if (next.value.token !== null && this._updated_rules.has(next.value.token)) {
						next.value = this._updated_rules.get(next.value.token)!;
					}
					// 無効化されているルールなら無視して次へ
					if (next.value.is_disabled) {
						continue;
					}
					break;
				}
				return next;
			},
			[Symbol.iterator]: () => {
				return itr;
			}
		};
		return itr;
	}
	getCurrentState(): LexStateLabel {
		return this._current_state;
	}
	jumpState(state: LexStateLabel): void {
		this._current_state = state;
	}
	callState(state: LexStateLabel): void {
		this._state_stack.push(this._current_state);
		this._current_state = state;
	}
	returnState(): LexStateLabel | undefined {
		const pop = this._state_stack.pop();
		if (pop === undefined) this._current_state = default_lex_state;
		else this._current_state = pop;
		return pop;
	}
}

/**
 * 字句解析器
 * 入力を受け取ってトークン化する
 */
export class Lexer implements ILexer {
	private rules: Map<LexStateLabel, Array<LexRule>>;
	private states: Map<LexStateLabel, LexState>;
	private lex: LexDefinition;
	constructor(private language: Language) {
		this.lex = language.lex;
		// initialize lex states map
		this.states = new Map();
		this.states.set(default_lex_state, {label: default_lex_state, is_exclusive: false});
		if (this.lex.states !== undefined) {
			for (const {label, is_exclusive} of this.lex.states) {
				this.states.set(label, {
					label,
					is_exclusive: is_exclusive !== undefined ? is_exclusive : false
				});
			}
		}

		// initialize lex rules
		this.rules = new Map();
		this.rules.set(default_lex_state, []);
		// exclusiveでない状態(デフォルト状態を除く)をまとめておく
		const non_exclusive_states = new Set();
		for (const [label, state] of this.states) {
			if (label !== default_lex_state && !state.is_exclusive) non_exclusive_states.add(state);
		}
		for (const _rule of this.lex.rules) {
			// clone rule
			const rule = {..._rule};
			if (rule.is_disabled === undefined) rule.is_disabled = false;
			// 正規表現を字句解析に適した形に整形
			if (rule.pattern instanceof RegExp) {
				rule.pattern = Lexer.ReformatRegExp(rule.pattern);
			}
			// 登録するべき状態を求める
			const states: Set<LexStateLabel> = new Set();
			for (const state of rule.state !== undefined ? rule.state : [default_lex_state]) {
				states.add(state);
				// デフォルト状態に登録する場合はnon-exclusiveな状態にも登録
				if (state === default_lex_state) {
					for (const non_exclusive_state of non_exclusive_states) states.add(non_exclusive_state);
				}
			}
			// 状態ごとに登録
			for (const state of states) {
				if (!this.rules.has(state)) {
					this.rules.set(state, []);
				}
				this.rules.get(state)!.push(rule);
			}
		}
	}
	exec(input: string): Array<TokenizedInput> {
		const result: Array<TokenizedInput> = [];
		let next_index = 0;
		const controller = new LexController(this.language, this.rules, this.states);
		while (next_index < input.length) {
			// 念の為undefined対策
			const current_rules = this.rules.has(controller.getCurrentState()) ? this.rules.get(controller.getCurrentState())! : [];
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
