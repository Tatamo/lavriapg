import {language_language, language_parser} from "../src/precompiler/ruleparser";
import {ParserGenerator} from "../src/parsergenerator/parsergenerator";
import {Language} from "../src";

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
A	"a"
<state1, state2>B	"b"
<default>B2	"b"
C	"c"
$S : A B2 C;
`;
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
		expect(parser.parse(input)).toMatchSnapshot();
	});
	test("ex-callbacks", () => {
		const input = `
#lex_end { lex_end_callback(); }
#lex_begin { lex_begin_callback(); }
#lex_default { lex_default_callback(); }
A	"a"

#default { grammar_default_callback(); }
$S : A;
`;
		expect(parser.parse(input)).toMatchSnapshot();
	});
	test("callback delimiters", () => {
		const input = `
A	"a" {{ if(1+1===3){ foo(); } }}

$S : T %{ const s = {}; }%;
T : E %%{ const t = "}%, }}%, }}%%, }%%%, }}%%%"; }%%;
E : { const e = "}%"+"}}"; } | A;
`;
		expect(parser.parse(input)).toMatchSnapshot();
	});
});
// TODO: languageファイルにコールバックも記述可能にして、それを読み取れるようにする
