import {Language} from "../def/language";
import {ParsingTable, AcceptOperation, ConflictedOperation, GotoOperation, ParsingOperation, ReduceOperation, ShiftOperation} from "../def/parsingtable";
import {SYMBOL_EOF, Token} from "../def/token";
import {ParserFactory} from "../parser/factory";
import {Parser} from "../parser/parser";
import {DFA, DFAGenerator} from "./dfagenerator";
import {GrammarDB} from "./grammardb";

export class ParserGenerator {
	private parsing_table: ParsingTable;
	private table_type: "LR1" | "LALR1" | "CONFLICTED";
	private grammardb: GrammarDB;
	private dfa_generator: DFAGenerator;

	constructor(private language: Language) {
		this.grammardb = new GrammarDB(this.language);
		this.dfa_generator = new DFAGenerator(this.grammardb);
		this.init();
	}

	private init() {
		const lalr_result = this.generateParsingTable(this.dfa_generator.getLALR1DFA());
		if (lalr_result.success) {
			this.parsing_table = lalr_result.table;
			this.table_type = "LALR1";
			return;
		}
		// LALR(1)構文解析表の生成に失敗
		// LR(1)構文解析表の生成を試みる
		console.error("LALR parsing conflict found. use LR(1) table.");
		const lr_result = this.generateParsingTable(this.dfa_generator.getLR1DFA());
		this.parsing_table = lr_result.table;
		this.table_type = "LR1";
		if (!lr_result.success) {
			// LR(1)構文解析表の生成に失敗
			this.table_type = "CONFLICTED";
			console.error("LR(1) parsing conflict found. use LR(1) conflicted table.");
		}
	}

	public getParser(): Parser {
		return ParserFactory.create(this.language, this.parsing_table);
	}

	public getParsingTable(): ParsingTable {
		return this.parsing_table;
	}

	public isConflicted(): boolean {
		return this.table_type === "CONFLICTED";
	}

	public getTableType(): "LR1" | "LALR1" | "CONFLICTED" {
		return this.table_type;
	}

	// 構文解析表を構築する
	private generateParsingTable(dfa: DFA) {
		const parsing_table: ParsingTable = [];
		let flg_conflicted = false;

		for (const node of dfa) {
			const table_row = new Map<Token, ParsingOperation>();
			// 辺をもとにshiftとgotoオペレーションを追加
			for (const [label, to] of node.edge) {
				if (this.grammardb.symbols.isTerminalSymbol(label)) {
					// ラベルが終端記号の場合
					// shiftオペレーションを追加
					const operation: ShiftOperation = {type: "shift", to};
					table_row.set(label, operation);
				}
				else if (this.grammardb.symbols.isNonterminalSymbol(label)) {
					// ラベルが非終端記号の場合
					// gotoオペレーションを追加
					const operation: GotoOperation = {type: "goto", to};
					table_row.set(label, operation);
				}
			}

			// Closureをもとにacceptとreduceオペレーションを追加していく
			for (const item of node.closure.getArray()) {
				// 規則末尾が.でないならスキップ
				// if(item.pattern.getRuleById(item.pattern.size-1) != SYMBOL_DOT) return;
				if (item.dot_index != this.grammardb.getRuleById(item.rule_id).pattern.length) continue;
				if (item.rule_id == -1) {
					// acceptオペレーション
					// この規則を読み終わると解析終了
					// $をラベルにacceptオペレーションを追加
					const operation: AcceptOperation = {type: "accept"};
					table_row.set(SYMBOL_EOF, operation);
					continue;
				}
				for (const label of item.lookaheads) {
					const operation: ReduceOperation = {type: "reduce", grammar_id: item.rule_id};
					// 既に同じ記号でオペレーションが登録されていないか確認

					if (table_row.has(label)) {
						// コンフリクトが発生
						flg_conflicted = true; // 構文解析に失敗
						const existing_operation = table_row.get(label)!; // 上で.has(label)のチェックを行っているためnon-nullable
						const conflicted_operation: ConflictedOperation = {type: "conflict", shift_to: [], reduce_grammar: []};
						if (existing_operation.type == "shift") {
							// shift/reduce コンフリクト
							conflicted_operation.shift_to = [existing_operation.to];
							conflicted_operation.reduce_grammar = [operation.grammar_id];
						}
						else if (existing_operation.type == "reduce") {
							// reduce/reduce コンフリクト
							conflicted_operation.shift_to = [];
							conflicted_operation.reduce_grammar = [existing_operation.grammar_id, operation.grammar_id];
						}
						else if (existing_operation.type == "conflict") {
							// もっとやばい衝突
							conflicted_operation.shift_to = existing_operation.shift_to;
							conflicted_operation.reduce_grammar = existing_operation.reduce_grammar.concat([operation.grammar_id]);
						}
						// とりあえず衝突したオペレーションを登録しておく
						table_row.set(label, conflicted_operation);
					}
					else {
						// 衝突しないのでreduceオペレーションを追加
						table_row.set(label, operation);
					}
				}
			}
			parsing_table.push(table_row);
		}
		// if (flg_conflicted) console.error("warn: some conflicts may be occured");
		return {table: parsing_table, success: !flg_conflicted};
	}
}
