import {default_lex_state, Language, LexDefinition, LexRule, LexState, LexStateLabel} from "../def/language";
import {SYMBOL_EOF, TokenizedInput} from "../def/token";

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
	private _temporary_rules: { states: Map<LexStateLabel, Set<string>>, rules: Map<string, LexRule> };
	private _rules: Map<LexStateLabel, Array<LexRule>>;
	private _states: Map<LexStateLabel, LexState>;
	constructor(language: Language) {
		this._lex = language.lex;
		this._current_state = default_lex_state;
		this._state_stack = [];
		this._temporary_rules = {states: new Map(), rules: new Map()};

		// initialize lex states map
		this._states = new Map();
		// もしlexの定義内にデフォルト状態の記述があっても上書きされるだけなので問題ない
		this._states.set(default_lex_state, {label: default_lex_state, is_exclusive: false});
		if (this._lex.states !== undefined) {
			for (const state of this._lex.states) {
				this._states.set(state.label, LexController.formatLexState(state));
			}
		}

		// initialize lex rules
		this._rules = new Map();
		this._rules.set(default_lex_state, []);
		for (const _rule of this._lex.rules) {
			// clone rule
			const rule = LexController.formatLexRule(_rule);
			// 状態ごとに登録
			for (const state of rule.state!) {
				if (!this._rules.has(state)) {
					this._rules.set(state, []);
				}
				this._rules.get(state)!.push(rule);
			}
		}
	}
	private static formatLexState(state: LexState): LexState {
		return {
			label: state.label,
			is_exclusive: state.is_exclusive !== undefined ? state.is_exclusive : false
		};
	}
	private static formatLexRule(rule: LexRule): LexRule {
		// clone rule
		const result = {...rule};
		if (result.is_disabled === undefined) result.is_disabled = false;
		// 状態指定を省略された場合はデフォルト状態のみとする
		if (result.state === undefined) result.state = [default_lex_state];
		// 正規表現を字句解析に適した形に整形
		if (result.pattern instanceof RegExp) {
			result.pattern = LexController.formatRegExp(result.pattern);
		}
		return result;
	}
	private static formatRegExp(pattern: RegExp): RegExp {
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
	/**
	 * 字句解析器の状態を与えると、それに対応する動的に追加されたルールを返す
	 * @param {LexStateLabel} state 字句解析機の状態を表すラベル
	 * @returns {Array<LexRule>} 対応する字句ルール
	 */
	private getTemporaryRules(state: LexStateLabel): Array<LexRule> {
		const result: Array<LexRule> = [];
		const set: Set<string> = this._temporary_rules.states.has(state) ? this._temporary_rules.states.get(state)! : new Set();
		for (const label of set) {
			if (this._temporary_rules.rules.has(label)) {
				result.push(this._temporary_rules.rules.get(label)!);
			}
		}
		if (state !== default_lex_state && this._states.has(state) && !this._states.get(state)!.is_exclusive) {
			if (this._temporary_rules.states.has(default_lex_state)) {
				for (const rule of this.getTemporaryRules(default_lex_state)) {
					result.push(rule);
				}
			}
		}
		return result;
	}
	private getBasicRules(state: LexStateLabel): Array<LexRule> {
		let result: Array<LexRule>;
		if (this._rules.has(state)) {
			result = this._rules.get(state)!;
		}
		else {
			result = [];
		}
		if (this._states.has(state) && !this._states.get(state)!.is_exclusive) {
			result = result.concat(this._rules.get(default_lex_state)!);
		}
		return result;
	}
	getRulesItr(): IterableIterator<LexRule> {
		const basic_r: Array<LexRule> = this.getBasicRules(this._current_state);
		const tmp_r: Array<LexRule> = this.getTemporaryRules(this._current_state);
		const itr_basic_rules = basic_r[Symbol.iterator]();
		const itr_temporary_rules = tmp_r[Symbol.iterator]();
		const itr: IterableIterator<LexRule> = {
			next: (): IteratorResult<LexRule> => {
				let next;
				while (true) {
					next = itr_basic_rules.next();
					if (next.done) next = itr_temporary_rules.next();
					// 繰り返し終了
					if (next.done) return next;

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
	addRule(label: string, rule: LexRule): void {
		// 同名の既存ルールを破棄
		this.removeRule(label);

		const formatted_rule = LexController.formatLexRule(rule);
		this._temporary_rules.rules.set(label, formatted_rule);
		const states: Array<LexStateLabel> = formatted_rule.state !== undefined ? formatted_rule.state : [default_lex_state];
		for (const state of states) {
			if (this._temporary_rules.states.has(state)) {
				this._temporary_rules.states.get(state)!.add(label);
			}
			else {
				this._temporary_rules.states.set(state, new Set([label]));
			}
		}
	}
	removeRule(label: string): LexRule | null {
		if (!this._temporary_rules.rules.has(label)) {
			return null;
		}
		const rule = this._temporary_rules.rules.get(label)!;
		const states: Array<LexStateLabel> = rule.state !== undefined ? rule.state : [default_lex_state];
		for (const state of states) {
			if (this._temporary_rules.states.has(state)) {
				this._temporary_rules.states.get(state)!.delete(label);
			}
		}
		return rule;
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
	constructor(private language: Language) {
		// do nothing
	}
	exec(input: string): Array<TokenizedInput> {
		const result: Array<TokenizedInput> = [];
		let next_index = 0;
		const controller = new LexController(this.language);
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
