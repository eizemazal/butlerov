import { ChemicalElements } from "../src/lib/elements";
import {LinearFormulaConverter} from "../src/converter/LinearFormula";
import { AtomicLinearFormulaFragment, CompositeLinearFormulaFragment } from "../src/lib/linear";

// tokenization is needed to display abbreviated labels attached to structures
// tokenization should break linear formulae into atomic fragments
// atoms can have hydrogens or electronegative atoms attached, so fragment is not necessarily one atom or abbreviation
// (this is akin to complex anions but is also fine for carbon containing groups)
test("Tokenize linear formulae", () => {
    const cases = {
        "Na": ["Na"],
        "K": ["K"],
        "Na+": ["Na+"],
        "Ca2+": ["Ca2+"],
        "Boc" : ["Boc"],
        "NHBoc": ["NH", "Boc"],
        "NHNH2": ["NH", "NH2"],
        "NHNH3+": ["NH", "NH3+"],
        "NH2+NH2": ["NH2+", "NH2"],
        "SO3": ["SO3"],
        "PhSO2O": ["Ph", "SO2", "O"],
        "NHAc": ["NH", "Ac"],
        "CH2CH2COOH": ["CH2", "CH2", "CO", "OH"],
        "SiF5-": ["SiF5-"],
        "SO3-": ["SO3-"],
        "CCl2CCl3": ["CCl2", "CCl3"],
        "COCH2CF2CH2NH3+": ["CO", "CH2", "CF2", "CH2", "NH3+"],
        "CH3CH2OH": ["CH3", "CH2", "OH"]
    };

    for (const [text, expected] of Object.entries(cases)) {
        const fragments = new LinearFormulaConverter().tokenize(text);
        expect(fragments.map(e => e.text )).toStrictEqual(expected);
    }
});


test("Read molecule from linear formulae", () => {

    const cases = {
        "CH3CH2CH2CH2OH" : { edges: 4, vertices: 5, single: 4, elements: {C: 4, O: 1}, ringsystems: 0 }
    };

    for (const [linear, descriptors] of Object.entries(cases)) {
        const graph = new LinearFormulaConverter().from_string(linear, null);
        expect(graph.vertices.length).toBe(descriptors.vertices);
        expect(graph.edges.length).toBe(descriptors.edges);
        expect(graph.edges.filter(e => e.bond_order == 1).length).toBe(descriptors.single);
        if ("double" in descriptors)
            expect(graph.edges.filter(e => e.bond_order == 2).length).toBe(descriptors.double);
        if ("triple" in descriptors)
            expect(graph.edges.filter(e => e.bond_order == 3).length).toBe(descriptors.triple);
        for (const [element, count] of Object.entries(descriptors.elements)) {
            expect(graph.vertices.filter(e => e.element == ChemicalElements[element]).length).toBe(count);
        }
        if ("ringsystems" in descriptors)
            expect(graph.ringsystems.length).toBe(descriptors.ringsystems);
    }
});


test("Convert linear to text segments", () => {

    type expectation = {
        text: string;
        index_rb?: string;
        index_rt?: string;
    }

    const cases : { [key:string]: expectation[]} = {
        "OCH2CH2NH2": [ {text: "O"}, {text:"CH", index_rb: "2"},  {text:"CH", index_rb: "2"}, {text:"NH", index_rb: "2", index_rt: ""},],
        "P+Ph3": [ {text: "P", index_rt: "+"}, {text:"Ph", index_rb: "3", index_rt: ""}],
        // this does not work: NMe3+ etc
        //"PPh3+": [ {text: "P", index_rt: "+"}, {text:"Ph", index_rb: "3", index_rt: "+"}],
        "COOH": [ {text: "C"}, {text: "O"}, {text: "O"}, {text: "H"} ],
        "CO2Et": [ {text: "C"}, {text: "O", index_rb: "2"}, {text: "Et"} ],
        "CN": [{text: "C"}, {"text": "N"}],
    };

    for (const [str, expected] of Object.entries(cases)) {
        const formula = new CompositeLinearFormulaFragment();
        formula.parse_string(str);
        const segments = formula.to_text_segments();
        expect(segments.length).toBe(expected.length);
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            expect(segment.text).toBe(expected[i].text);
            expect(segments[i].index_rb).toBe(expected[i].index_rb ? expected[i].index_rb : "");
            expect(segments[i].index_rt).toBe(expected[i].index_rt ? expected[i].index_rt : "");
        }
    }

    // TODO: combine with above when parsing implemented for (CH2)5Br
    const lf = new CompositeLinearFormulaFragment([new AtomicLinearFormulaFragment(ChemicalElements["C"], "(CH2)5"), new AtomicLinearFormulaFragment(ChemicalElements["Br"], "Br")]);
    (lf.components[0] as AtomicLinearFormulaFragment).n_hydrogens = 2;
    lf.components[0].count = 5;
    const expected = [ {text:"(CH", index_rb: "2"},  {text:")", index_rb: "5"}, {text:"Br"}];
    const segments = lf.to_text_segments();
    console.log(segments);
    expect(segments.length).toBe(expected.length);
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        expect(segment.text).toBe(expected[i].text);
        expect(segments[i].index_rb).toBe(expected[i].index_rb ? expected[i].index_rb : "");
    }
});