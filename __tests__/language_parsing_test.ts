import {language_language, language_parser} from "../src/precompiler/ruleparser";
import {ParserGenerator} from "../src/parsergenerator/parsergenerator";

describe("language parsing test", () => {
	const input = require("fs").readFileSync("language", "utf8");
	const lex = {...language_language.lex};
	lex.rules = lex.rules.map((rule) => {
		return {token: rule.token, pattern: rule.pattern};
	});
	const grammar = {...language_language.grammar};
	grammar.rules = grammar.rules.map((rule) => {
		return {ltoken: rule.ltoken, pattern: rule.pattern};
	});
	const language_language_without_callback = {lex, grammar};
	const pg = new ParserGenerator(language_language);
	test("valid parser", () => {
		expect(pg.isConflicted()).toBeFalsy();
	});
	const parser = pg.getParser(); // language_parserと同一のものであることが期待される
	test("parsing language file", () => {
		expect(parser.parse(input)).toEqual(language_language_without_callback);
	});
	// languageファイルを読み取ってパーサを生成したい
	test("language_parser", () => {
		expect(language_parser.parse(input)).toEqual(language_language_without_callback);
	});
});

describe("syntax functions test", () => {
	const pg = new ParserGenerator(language_language);
	const parser = pg.getParser();
	test("lex-state", () => {
		const input = `A	"a"
<state1, state2>B	"b"
<default>B2	"b"
C	"c"
$S : A B2 C;
`;
		expect(parser.parse(input)).toMatchSnapshot();
	});
});
// TODO: languageファイルにコールバックも記述可能にして、それを読み取れるようにする
