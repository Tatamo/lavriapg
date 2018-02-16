import {Language} from "../def/language";
import {SYMBOL_EOF, Token} from "../def/token";
import {ParserGenerator} from "../parsergenerator/parsergenerator";
import {language_parser} from "./ruleparser";
import {ParsingOperation} from "../def/parsingtable";

/**
 * 予め構文解析器を生成しておいて利用するためのソースコードを生成する
 */
export class PreCompiler {
	/**
	 * @param import_path パーサジェネレータをimportするためのディレクトリパス
	 */
	constructor(private import_path: string = "lavriapg") {
		if (import_path[import_path.length - 1] != "/") this.import_path += "/";
	}
	/**
	 * 構文ファイルを受け取り、それを処理できるパーサを構築するためのソースコードを返す
	 * @param {string} input 言語定義文法によって記述された、解析対象となる言語
	 * @returns {string} 生成されたパーサのソースコード
	 */
	public exec(input: string): string {
		const language: Language = language_parser.parse(input);
		const parsing_table = new ParserGenerator(language).getParsingTable();
		let result = "";

		result += `import {Token, SYMBOL_EOF} from "${this.import_path}def/token";
import {Language} from "${this.import_path}def/language";
import {ParsingOperation, ParsingTable} from "${this.import_path}def/parsingtable";
import {Parser} from "${this.import_path}parser/parser";
import {ParserFactory} from "${this.import_path}parser/factory";

export const language: Language = {
	lex: {
		rules: [
${language.lex.rules.map(({token, pattern}) => {
			return `\t\t\t{token: ${token === null ? "null" : `"${token}"`}, ` +
				`pattern: ${pattern instanceof RegExp ? pattern : `"${pattern}"`}}`;
		}).join(",\n")}
		]
	},
	grammar: {
		rules: [
${language.grammar.rules.map(({ltoken, pattern}) => `\t\t\t{
				ltoken: "${ltoken as string}",
				pattern: [${pattern.map((t) => `"${t as string}"`).join(", ")}]
			}`).join(",\n")}
		],
		start_symbol: "${language.grammar.start_symbol as string}"
	}
};

export const parsing_table: ParsingTable = [
${parsing_table.map((row: Map<Token, ParsingOperation>) => `\tnew Map<Token, ParsingOperation>([
${(() => {
			let line = "";
			for (const [key, value] of row) {
				line += `\t\t[${key === SYMBOL_EOF ? "SYMBOL_EOF" : `"${key as string}"`}, ${JSON.stringify(value)}],\n`;
			}
			return line.slice(0, -2);
		})()}`).join("\n\t]),\n")}
	])
];

export const parser: Parser = ParserFactory.create(language, parsing_table);
`;
		return result;
	}
}
