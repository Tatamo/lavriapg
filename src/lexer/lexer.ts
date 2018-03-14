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

export type LexRuleLabel = string;

class LexRuleManager {
	// private states: { states: Map<LexStateLabel, LexState>, index: Map<LexStateLabel, Set<number>>, inheritance: Map<LexStateLabel, LexStateLabel> };
	private states: Map<LexStateLabel, { state: LexState, index: Set<number>, inheritance: LexStateLabel | null }>;
	private rules: { rules: Array<LexRule | undefined>, labels: Map<LexRuleLabel, number> };
	// 各ルールに一意なidを割り当てるためのカウンタ
	private id_counter: number;
	// ルールの削除によって割り当てがなくなったid
	private free_ids: Array<number>;
	constructor(language: Language) {
		const lex = language.lex;
		this.id_counter = 0;
		this.free_ids = [];

		// initialize lex states map
		this.states = new Map();
		// もしlexの定義内にデフォルト状態の記述があっても上書きされるだけなので問題ない
		this.addState({label: default_lex_state, is_exclusive: false});
		if (lex.states !== undefined) {
			for (const state of lex.states) {
				this.addState(state);
			}
		}

		// initialize lex rules
		this.rules = {rules: [], labels: new Map()};

		for (const rule of lex.rules.map((r) => LexRuleManager.formatLexRule(r))) {
			this.rules.rules[this.id_counter] = rule;
			// 状態ごとにインデックスを張る
			for (const state of rule.state!) {
				// TODO: statesに入れる
				if (!this.states.has(state)) {
					this.addState(state);
				}
				this.states.get(state)!.index.add(this.id_counter);
			}
			this.id_counter += 1;
		}
	}
	addState(label: LexStateLabel): boolean;
	addState(state: LexState): boolean;
	addState(s: LexStateLabel | LexState): boolean {
		let state: LexState;
		if (typeof s === "object") {
			state = s;
		}
		else {
			state = {label: s};
		}
		state = LexRuleManager.formatLexState(state);
		if (this.states.has(state.label)) {
			return false;
		}
		const inheritance: LexStateLabel | null = state.is_exclusive ? null : default_lex_state;
		this.states.set(state.label, {state, index: new Set(), inheritance});
		// ループチェック
		if (inheritance !== null) {
			let flg_loop = false;
			let parent = this.states.get(inheritance);
			while (parent !== undefined && parent.inheritance !== null) {
				// 状態を追加するたびにチェックするので、自身にたどりつかないことを調べればよい
				if (parent.inheritance === state.label) {
					flg_loop = true;
					break;
				}
				parent = this.states.get(parent.inheritance);
			}
			if (flg_loop) this.states.get(state.label)!.inheritance = null;
		}
		return true;
	}
	getRulesItr(state: LexStateLabel): IterableIterator<LexRule> {
		// そんな状態はない
		if (!this.states.has(state)) return [][Symbol.iterator]();

		// 継承を加味
		let result: Array<number> = [];
		let s = this.states.get(state);
		while (s !== undefined) {
			result = result.concat([...s.index]);
			if (s.inheritance === null) break;
			s = this.states.get(s.inheritance);
		}

		return (function* (self, itr) {
			for (const id of itr) {
				if (self.rules.rules[id] !== undefined) yield self.rules.rules[id]!;
			}
		})(this, new Set(result)[Symbol.iterator]());
	}
	addRule(label: LexRuleLabel, rule: LexRule): void {
		// 同名の既存ルールを破棄
		this.removeRule(label);

		const formatted_rule = LexRuleManager.formatLexRule(rule);

		const id = this.free_ids.length > 0 ? this.free_ids.pop()! : this.id_counter++;
		this.rules.rules[id] = formatted_rule;
		this.rules.labels.set(label, id);
		for (const state of formatted_rule.state!) {
			if (!this.states.has(state)) this.addState(state);
			this.states.get(state)!.index.add(id);
		}
	}
	removeRule(label: LexRuleLabel): LexRule | null {
		if (!this.rules.labels.has(label)) {
			return null;
		}
		const id = this.rules.labels.get(label)!;
		const rule = this.rules.rules[id];
		if (rule === undefined) return null;

		for (const state of rule.state!) {
			if (this.states.has(state)) {
				this.states.get(state)!.index.delete(id);
			}
		}
		this.rules.rules[id] = undefined;
		this.free_ids.push(id);
		return rule;
	}
	static formatLexState(state: LexState): LexState {
		return {
			label: state.label,
			is_exclusive: state.is_exclusive !== undefined ? state.is_exclusive : false
		};
	}
	static formatLexRule(rule: LexRule): LexRule {
		// clone rule
		const result = {...rule};
		if (result.is_disabled === undefined) result.is_disabled = false;
		// 状態指定を省略された場合はデフォルト状態のみとする
		if (result.state === undefined) result.state = [default_lex_state];
		// 正規表現を字句解析に適した形に整形
		if (result.pattern instanceof RegExp) {
			result.pattern = LexRuleManager.formatRegExp(result.pattern);
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
}

export class LexController {
	private _lex: LexDefinition;
	private _current_state: LexStateLabel;
	private _state_stack: Array<LexStateLabel>;
	private _rules: LexRuleManager;
	constructor(language: Language) {
		this._lex = language.lex;
		this._current_state = default_lex_state;
		this._state_stack = [];
		this._rules = new LexRuleManager(language);
	}
	getRulesItr(): IterableIterator<LexRule> {
		return this._rules.getRulesItr(this._current_state);
	}
	addRule(label: string, rule: LexRule): void {
		this._rules.addRule(label, rule);
	}
	removeRule(label: string): LexRule | null {
		return this._rules.removeRule(label);
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
