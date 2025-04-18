import {language_language, language_parser} from "../src/precompiler/ruleparser";
import {ParserGenerator} from "../src/parsergenerator/parsergenerator";
import {Language} from "../src";
import {Lexer} from "../src/lexer/lexer";
import {SYMBOL_EOF} from "../src/def/token";

describe("language parsing test", () => {
	const input = require("fs").readFileSync("language", "utf8");
	const removeCallback = (language: Language): Language => {
		const lex = {...language.lex};
		lex.rules = lex.rules.map(({token, pattern, states}) => ({token, pattern, states}));
		const grammar = {...language.grammar};
		grammar.rules = grammar.rules.map(({ltoken, pattern}) => ({ltoken, pattern}));
		return {lex, grammar};
	};

	const language_language_without_callback = removeCallback(language_language);
	const pg = new ParserGenerator(language_language);
	test("valid parser", () => {
		expect(pg.isConflicted()).toBeFalsy();
	});
	const parser = pg.getParser(); // language_parserと同一のものであることが期待される
	test("parsing language file", () => {
		expect(removeCallback(parser.parse(input))).toEqual(language_language_without_callback);
	});
	// languageファイルを読み取ってパーサを生成したい
	test("language_parser", () => {
		expect(removeCallback(language_parser.parse(input))).toEqual(language_language_without_callback);
	});
});

describe("syntax functions test", () => {
	const pg = new ParserGenerator(language_language);
	const parser = pg.getParser();
	test("lex-state", () => {
		const input = `
A	/a/
<state1, state2>B	/b/
<default>B2	/b/
C	/c/
$S : A B2 C;
`;
		expect(new Lexer(parser.parse(input)).exec("b")).toEqual([{token: "B2", value: "b"}, {token: SYMBOL_EOF, value: ""}]);
		expect(parser.parse(input)).toMatchSnapshot();
	});
	test("#start", () => {
		// #startが複数ある場合は一番下を採用
		// TODO: 明示された仕様とするか、それとも複数の#startを許容しないようにするか
		const input = `
#start <default>
#start <state1>

<default>A	/a/
<state1, state2>A2	/a/
B	/b/
$S : A B;
`;
		expect(new Lexer(parser.parse(input)).exec("a")).toEqual([{token: "A2", value: "a"}, {token: SYMBOL_EOF, value: ""}]);
		expect(() => new Lexer(parser.parse(input)).exec("b")).toThrow();
		expect(parser.parse(input)).toMatchSnapshot();
	});
	test("#extend", () => {
		const input = `
#start <state3>
#extend <state1, state2> <default>
#extend <state3><state2>

<state3>A	/a/
<state2>B	/b/
<default>C	/c/
$S : A B C;
`;
		expect(new Lexer(parser.parse(input)).exec("abc")).toMatchSnapshot();
		expect(parser.parse(input)).toMatchSnapshot();
	});
	test("callbacks", () => {
		const input = `
A	"a" { callback_of_A(); }
B	/b/ { callback_of_B(); }

$S : T { callback_of_S(); };
T : A { callback_of_T_1(); } | E { callback_of_T_2(); } | { callback_of_T_3(); };
E : { callback_of_E(); } | B;
`;
		const result = parser.parse(input);
		expect(result).toMatchSnapshot();
		// @ts-ignore
		expect(result.grammar.rules.map((rule) => "callback" in rule ? rule.callback.toString() : undefined)).toMatchSnapshot();
	});
	test("ex-callbacks", () => {
		const input = `
#lex_default { lex_default_callback(); }
#lex_end { lex_end_callback(); }
#lex_begin { lex_begin_callback(); }
A	"a"

#begin { grammar_begin_callback(); }
#end { grammar_end_callback(); }
#default { grammar_default_callback(); }
$S : A;
`;
		const result = parser.parse(input);
		expect(result).toMatchSnapshot();
		expect(result.lex.begin_callback.toString()).toMatchSnapshot();
		expect(result.lex.default_callback.toString()).toMatchSnapshot();
		expect(result.lex.end_callback.toString()).toMatchSnapshot();
		expect(result.grammar.begin_callback.toString()).toMatchSnapshot();
		expect(result.grammar.default_callback.toString()).toMatchSnapshot();
		expect(result.grammar.end_callback.toString()).toMatchSnapshot();
	});
	test("callback delimiters", () => {
		const input = `
A	"a" {{ if(1+1===3){ foo(); } }}

$S : T %{ const s = {}; }%;
T : E %%{ const t = "}%, }}%, }}%%, }%%%, }}%%%"; }%%;
E : { const e = "}%"+"}}"; } | A;
`;
		const result = parser.parse(input);
		expect(result).toMatchSnapshot();
		// @ts-ignore
		expect(result.grammar.rules.map((rule) => "callback" in rule ? rule.callback.toString() : undefined)).toMatchSnapshot();
	});
});
