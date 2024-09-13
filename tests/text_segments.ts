import {SegmentedText, TextSegment} from "../src/drawable/SegmentedText";

test("Splitting text into segments", () => {
    const cases = {
        "Na" : [ new TextSegment("Na") ],
        "C" : [ new TextSegment("C") ],
        "Cl" : [ new TextSegment("Cl") ],
        "O2" : [ new TextSegment("O", "2") ],
        "H2O" : [ new TextSegment("H", "2"), new TextSegment("O") ],
        "Na2SO4" : [ new TextSegment("Na", "2"),new TextSegment("SO", "4") ],
    };

    for (const [text, result] of Object.entries(cases)) {
        const segmented_text = new SegmentedText();
        segmented_text.format_text(text);
        expect(JSON.stringify(segmented_text.segments)).toBe(JSON.stringify(result));
    }
});
