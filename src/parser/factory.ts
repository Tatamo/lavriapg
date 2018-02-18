import {Language} from "../def/language";
import {ParsingTable} from "../def/parsingtable";
import {Lexer} from "../lexer/lexer";
import {Parser} from "./parser";

/**
 * Parserを生成するためのファクトリクラス
 */
export class ParserFactory {
	/**
	 * 言語
	 * @param {Language} language 解析する言語情報
	 * @param {ParsingTable} parsing_table 構文解析表
	 * @returns {Parser} 生成されたパーサ
	 */
	public static create(language: Language, parsing_table: ParsingTable): Parser {
		const lexer = new Lexer(language);
		return new Parser(lexer, language.grammar, parsing_table);
	}
}
