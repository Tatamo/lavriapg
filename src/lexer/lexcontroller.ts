import {DEFAULT_LEX_STATE, Language, LexCallback, LexDefinition, LexRule, LexState, LexStateLabel} from "../def/language";

export type LexRuleLabel = string;

/**
 * 字句解析器の状態と字句ルールの紐付けと管理を行うクラス
 */
class LexRuleManager {
	// private states: { states: Map<LexStateLabel, LexState>, index: Map<LexStateLabel, Set<number>>, inheritance: Map<LexStateLabel, LexStateLabel> };
	private states: Map<LexStateLabel, { state: LexState, index: Set<number> }>;
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
		this.setState({label: DEFAULT_LEX_STATE});
		if (lex.states !== undefined) {
			for (const state of lex.states) {
				this.setState(state);
			}
		}

		// initialize lex rules
		this.rules = {rules: [], labels: new Map()};

		for (const rule of lex.rules.map((r) => LexRuleManager.formatLexRule(r))) {
			this.rules.rules[this.id_counter] = rule;
			// 状態ごとにインデックスを張る
			for (const state of rule.states!) {
				// TODO: statesに入れる
				if (!this.states.has(state)) {
					this.setState(state);
				}
				this.states.get(state)!.index.add(this.id_counter);
			}
			this.id_counter += 1;
		}
	}
	/**
	 * 新しい状態を追加する 既に存在している場合は上書きするが、状態に登録されたルールは維持される
	 * @param {LexStateLabel} label 新しい状態の名前 名前以外のプロパティは初期値が用いられる
	 * @returns {boolean} 追加に成功したかどうか　継承関係が循環していた場合、追加は行われずfalseが返る
	 */
	setState(label: LexStateLabel): boolean;
	/**
	 * 新しい状態を追加する 既に存在している場合は上書きするが、状態に登録されたルールは維持される
	 * @param {LexState} state 新しい状態
	 * @returns {boolean} 追加に成功したかどうか　継承関係が循環していた場合、追加は行われずfalseが返る
	 */
	setState(state: LexState): boolean;
	setState(s: LexStateLabel | LexState): boolean {
		let state: LexState;
		if (typeof s === "object") {
			state = s;
		}
		else {
			state = {label: s};
		}
		state = LexRuleManager.formatLexState(state);
		// ループチェック
		const isLooped = (state: LexState): boolean => {
			if (state.inheritance !== undefined) {
				let flg_loop = false;
				let parent = this.states.get(state.inheritance);
				while (parent !== undefined && parent.state.inheritance !== undefined) {
					// 状態を追加するたびにチェックするので、自身にたどりつかないことを調べればよい
					if (parent.state.inheritance === state.label) {
						flg_loop = true;
						break;
					}
					parent = this.states.get(parent.state.inheritance);
				}
				if (flg_loop) return true;
			}
			return false;
		};
		// 循環継承が存在する場合は追加できない
		if (isLooped(state)) return false;
		if (this.states.has(state.label)) {
			// 既に追加済みの場合はindexをそのまま維持する
			this.states.get(state.label)!.state = state;
		}
		else {
			this.states.set(state.label, {state, index: new Set()});
		}
		return true;
	}
	// TODO: パフォーマンス改善
	/**
	 * 与えられた状態に登録されている字句ルールの一覧をイテレータとして返す
	 * @param {LexStateLabel} label 字句ルールを取得する状態の名前
	 * @returns {IterableIterator<LexRule>} 字句ルールが得られるイテレータ
	 */
	getRulesItr(label: LexStateLabel): IterableIterator<LexRule> {
		// そんな状態はない
		if (!this.states.has(label)) return [][Symbol.iterator]();

		// 継承を加味
		let result: Array<number> = [];
		let s = this.states.get(label);
		while (s !== undefined) {
			result = result.concat([...s.index]);
			if (s.state.inheritance === undefined) break;
			s = this.states.get(s.state.inheritance);
		}
		// 暫定的処置
		result.sort((a: number, b: number) => a - b);

		return (function* (self, itr) {
			for (const id of itr) {
				if (self.rules.rules[id] !== undefined) yield self.rules.rules[id]!;
			}
		})(this, new Set(result)[Symbol.iterator]());
	}
	// TODO べつにlabelを省略可能にしてもいいのでは
	/**
	 * 新しい字句ルールを名前をつけて追加する 既に存在している場合は上書きする
	 * @param {LexRuleLabel} label 新しいルールの名前
	 * @param {LexRule} rule 新しく追加するルール
	 */
	setRule(label: LexRuleLabel, rule: LexRule): void {
		// 同名の既存ルールを破棄
		this.removeRule(label);

		const formatted_rule = LexRuleManager.formatLexRule(rule);

		const id = this.free_ids.length > 0 ? this.free_ids.pop()! : this.id_counter++;
		this.rules.rules[id] = formatted_rule;
		this.rules.labels.set(label, id);
		for (const state of formatted_rule.states!) {
			if (!this.states.has(state)) this.setState(state);
			this.states.get(state)!.index.add(id);
		}
	}
	/**
	 * 名前がついた字句ルールを指定して削除する
	 * @param {LexRuleLabel} label 削除するルールの名前
	 * @returns {LexRule | undefined} 削除したルール 該当するものがない場合はundefined
	 */
	removeRule(label: LexRuleLabel): LexRule | undefined {
		if (!this.rules.labels.has(label)) {
			return undefined;
		}
		const id = this.rules.labels.get(label)!;
		const rule = this.rules.rules[id];
		if (rule === undefined) return undefined;

		for (const state of rule.states!) {
			if (this.states.has(state)) {
				this.states.get(state)!.index.delete(id);
			}
		}
		this.rules.rules[id] = undefined;
		this.free_ids.push(id);
		return rule;
	}
	/**
	 * 未定義プロパティに初期値を割り当てるなど、扱いやすい形に整形した新しい状態を生成する
	 * @param {LexState} state もともとの状態
	 * @returns {LexState} 整形された新しい状態
	 */
	static formatLexState(state: LexState): LexState {
		// clone state
		return {...state};
	}
	/**
	 * 未定義プロパティに初期値を割り当てるなど、扱いやすい形に整形した新しい字句ルールを生成する
	 * @param {LexRule} rule もともとの字句ルール
	 * @returns {LexRule} 整形された新しい字句ルール
	 */
	static formatLexRule(rule: LexRule): LexRule {
		// clone rule
		const result: LexRule = {...rule};
		if (result.is_disabled === undefined) result.is_disabled = false;
		// 状態指定を省略された場合はデフォルト状態のみとする
		if (result.states === undefined) result.states = [DEFAULT_LEX_STATE];
		// 正規表現を字句解析に適した形に整形
		if (result.pattern instanceof RegExp) {
			result.pattern = LexRuleManager.formatRegExp(result.pattern);
		}
		return result;
	}
	/**
	 * 字句解析時に必要なフラグを追加し、不要なフラグを取り除いた新しい正規表現オブジェクトを生成する
	 * @param {RegExp} pattern もともとの正規表現
	 * @returns {RegExp} 整形された新しい正規表現
	 */
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

/**
 * 解析中の字句解析器の状態を操作するクラス
 */
export class LexController {
	private _lex: LexDefinition;
	private _current_state: LexStateLabel;
	private _state_stack: Array<LexStateLabel>;
	private _rules: LexRuleManager;
	constructor(language: Language) {
		this._lex = language.lex;
		this._current_state = DEFAULT_LEX_STATE;
		this._state_stack = [];
		this._rules = new LexRuleManager(language);
	}
	/**
	 * 個別にコールバックが設定されていない規則に対して適用するデフォルトコールバックを得る
	 * @returns {LexCallback | undefined} デフォルトコールバック 定義されていない場合はundefined
	 */
	get defaultCallback(): LexCallback | undefined {
		return this._lex.default_callback;
	}
	/**
	 * 字句解析開始時のコールバックを呼び出す
	 */
	onBegin(): void {
		if (this._lex.begin_callback !== undefined) this._lex.begin_callback(this);
	}
	/**
	 * 字句解析終了時のコールバックを呼び出す
	 */
	onEnd(): void {
		if (this._lex.end_callback !== undefined) this._lex.end_callback(this);
	}
	/**
	 * 現在の状態で適用可能な字句ルールをイテレータとして返す
	 * @returns {IterableIterator<LexRule>} 字句ルールを得ることができるイテレータ
	 */
	getRulesItr(): IterableIterator<LexRule> {
		return this._rules.getRulesItr(this._current_state);
	}
	/**
	 * 新しい字句ルールを名前をつけて追加する
	 * @param {string} label ルールの区別のために与える名前
	 * @param {LexRule} rule 追加する字句ルール
	 */
	addRule(label: string, rule: LexRule): void {
		this._rules.setRule(label, rule);
	}
	/**
	 * 既存の字句ルールを削除する
	 * @param {string} label 削除するルールの名前
	 * @returns {LexRule | undefined} 削除したルール 該当するものがない場合はundefined
	 */
	removeRule(label: string): LexRule | undefined {
		return this._rules.removeRule(label);
	}
	/**
	 * 現在の字句解析器の状態名を得る
	 * @returns {LexStateLabel} 現在の状態名
	 */
	getCurrentState(): LexStateLabel {
		return this._current_state;
	}
	/**
	 * 字句解析機の解析状態を別の状態に変更する
	 * @param {LexStateLabel} label 新しい状態の名前
	 */
	jumpState(label: LexStateLabel): void {
		this._current_state = label;
	}
	/**
	 * 現在の状態をスタックに積んでから別の状態に変更する
	 * @param {LexStateLabel} label 新しい状態の名前
	 */
	callState(label: LexStateLabel): void {
		this._state_stack.push(this._current_state);
		this._current_state = label;
	}
	/**
	 * スタックから1つ取り出し、その状態に変更する
	 * スタックが空の場合は状態を変更しない
	 * @returns {LexStateLabel | undefined} 変更した状態の名前 スタックが空の場合はundefined
	 */
	returnState(): LexStateLabel | undefined {
		const pop = this._state_stack.pop();
		if (pop !== undefined) this._current_state = pop;
		return pop;
	}
}
