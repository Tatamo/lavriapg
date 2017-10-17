import {GrammarDefinition} from "../def/grammar";
import {ParsingTable, AcceptOperation, ConflictedOperation, GotoOperation, ParsingOperation, ReduceOperation, ShiftOperation} from "../def/parsingtable";
import {SYMBOL_EOF, Token} from "../def/token";
import {ParserFactory} from "../parser/factory";
import {Parser, ParserCallback} from "../parser/parser";
import {DFA, DFAGenerator} from "./dfagenerator";
import {SyntaxDB} from "./syntaxdb";

export class ParserGenerator {
	private parsing_table: ParsingTable;
	private syntax: SyntaxDB;
	private dfa_generator: DFAGenerator;
	constructor(private grammar: GrammarDefinition) {
		this.syntax = new SyntaxDB(this.grammar);
		this.dfa_generator = new DFAGenerator(this.syntax);
		this.init();
	}
	private init() {
		const lalr_result = this.generateParsingTable(this.dfa_generator.getLALR1DFA());
		if (lalr_result.success) {
			this.parsing_table = lalr_result.table;
		}
		else {
			console.error("LALR parsing conflict found. return LR(1) table.");
			const lr_result = this.generateParsingTable(this.dfa_generator.getLR1DFA());
			this.parsing_table = lr_result.table;
			if (!lr_result.success) {
				console.error("LR(1) parsing conflict found. return LR(1) conflicted table.");
			}
		}
	}
	public getParser(default_callback?: ParserCallback): Parser {
		return ParserFactory.create(this.grammar, this.parsing_table, default_callback);
	}
	public getParsingTable(): ParsingTable {
		return this.parsing_table;
	}

	// 構文解析表を構築する
	private generateParsingTable(dfa: DFA) {
		const parsing_table: ParsingTable = [];
		let flg_conflicted = false;

		for (const node of dfa) {
			const table_row = new Map<Token, ParsingOperation>();
			// 辺をもとにshiftとgotoオペレーションを追加
			for (const [label, to] of node.edge) {
				if (this.syntax.symbols.isTerminalSymbol(label)) {
					// ラベルが終端記号の場合
					// shiftオペレーションを追加
					const operation: ShiftOperation = {type: "shift", to};
					table_row.set(label, operation);
				}
				else if (this.syntax.symbols.isNonterminalSymbol(label)) {
					// ラベルが非終端記号の場合
					// gotoオペレーションを追加
					const operation: GotoOperation = {type: "goto", to};
					table_row.set(label, operation);
				}
			}

			// Closureをもとにacceptとreduceオペレーションを追加していく
			for (const item of node.closure.getArray()) {
				// 規則末尾が.でないならスキップ
				// if(item.pattern.getDefinitionById(item.pattern.size-1) != SYMBOL_DOT) return;
				if (item.dot_index != this.syntax.getDefinitionById(item.syntax_id).pattern.length) continue;
				if (item.syntax_id == -1) {
					// acceptオペレーション
					// この規則を読み終わると解析終了
					// $をラベルにacceptオペレーションを追加
					const operation: AcceptOperation = {type: "accept"};
					table_row.set(SYMBOL_EOF, operation);
					continue;
				}
				for (const label of item.lookaheads) {
					const operation: ReduceOperation = {type: "reduce", syntax: item.syntax_id};
					// 既に同じ記号でオペレーションが登録されていないか確認

					if (table_row.has(label)) {
						// コンフリクトが発生
						flg_conflicted = true; // 構文解析に失敗
						const existing_operation = table_row.get(label)!; // 上で.has(label)のチェックを行っているためnon-nullable
						const conflicted_operation: ConflictedOperation = {type: "conflict", shift_to: [], reduce_syntax: []};
						if (existing_operation.type == "shift") {
							// shift/reduce コンフリクト
							conflicted_operation.shift_to = [existing_operation.to];
							conflicted_operation.reduce_syntax = [operation.syntax];
						}
						else if (existing_operation.type == "reduce") {
							// reduce/reduce コンフリクト
							conflicted_operation.shift_to = [];
							conflicted_operation.reduce_syntax = [existing_operation.syntax, operation.syntax];
						}
						else if (existing_operation.type == "conflict") {
							// もっとやばい衝突
							conflicted_operation.shift_to = existing_operation.shift_to;
							conflicted_operation.reduce_syntax = existing_operation.reduce_syntax.concat([operation.syntax]);
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
		if (flg_conflicted) console.error("warn: some conflicts may be occured");
		return {table: parsing_table, success: !flg_conflicted};
	}
}
