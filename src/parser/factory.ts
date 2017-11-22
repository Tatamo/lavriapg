import {Language} from "../def/language";
import {ParsingTable} from "../def/parsingtable";
import {Lexer} from "../lexer/lexer";
import {Parser} from "./parser";
import {ASTConstructor, DefaultCallbackController} from "./callback";

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
		const callback_controller = new DefaultCallbackController(language);
		const lexer = new Lexer(language.lex);
		const parser = new Parser(lexer, language.grammar, parsing_table);
		parser.setCallbackController(callback_controller);
		return parser;
	}
	public static createAST(language: Language, parsing_table: ParsingTable): Parser {
		const callback_controller = new ASTConstructor(language);
		const lexer = new Lexer(language.lex);
		const parser = new Parser(lexer, language.grammar, parsing_table);
		parser.setCallbackController(callback_controller);
		return parser;
	}
}
