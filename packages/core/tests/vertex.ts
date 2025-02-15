import { editor, fire_key, fire } from "../src/lib/testing";

beforeEach(() => {
    editor.clear();
});

test("Charges", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.document_container.graph.vertices.length).toBe(2);
    fire(editor.document_container.graph.vertices[0].coords, "mousemove");
    fire_key("+");
    expect(editor.document_container.graph.vertices[0].charge).toBe(1);
    fire_key("+");
    expect(editor.document_container.graph.vertices[0].charge).toBe(2);
    fire_key("-");
    fire_key("-");
    expect(editor.document_container.graph.vertices[0].charge).toBe(0);
    fire_key("-");
    expect(editor.document_container.graph.vertices[0].charge).toBe(-1);
    fire_key("-");
    expect(editor.document_container.graph.vertices[0].charge).toBe(-2);
    fire_key("z", { ctrlKey: true });
    expect(editor.document_container.graph.vertices[0].charge).toBe(0);
});

test("Implicit H test", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.document_container.graph.vertices.length).toBe(2);
    fire(editor.document_container.graph.vertices[0].coords, "mousemove");
    fire_key("N");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("N");
    expect(editor.document_container.graph.vertices[0].charge).toBe(0);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(2);
    fire_key("+");
    expect(editor.document_container.graph.vertices[0].charge).toBe(1);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(3);
    fire_key("-");
    expect(editor.document_container.graph.vertices[0].charge).toBe(0);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(2);
    fire_key("-");
    expect(editor.document_container.graph.vertices[0].charge).toBe(-1);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(1);
    fire_key("-");
    expect(editor.document_container.graph.vertices[0].charge).toBe(-2);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(0);
    fire_key("-");
    expect(editor.document_container.graph.vertices[0].charge).toBe(-3);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(0);
    fire_key("+");
    fire_key("+");
    fire_key("B");
    fire_key("B");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("B");
    expect(editor.document_container.graph.vertices[0].charge).toBe(-1);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(3);
});


test("Change elements back and forth", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.document_container.graph.vertices.length).toBe(2);
    fire(editor.document_container.graph.vertices[0].coords, "mousemove");
    fire_key("C");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("Cl");
    expect(editor.document_container.graph.vertices[0].charge).toBe(0);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(0);
    fire_key("C");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("Ca");
    expect(editor.document_container.graph.vertices[0].h_count).toBe(1);
    fire_key("C");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("Cu");
    expect(editor.document_container.graph.vertices[0].h_count).toBe(0);
    fire_key("C");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("Cd");
    expect(editor.document_container.graph.vertices[0].h_count).toBe(1);
    fire_key("C", { shiftKey: true });
    fire_key("C", { shiftKey: true });
    fire_key("C", { shiftKey: true });
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("Cl");
    expect(editor.document_container.graph.vertices[0].charge).toBe(0);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(0);
    fire_key("C", { shiftKey: true });
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("C");
    expect(editor.document_container.graph.vertices[0].charge).toBe(0);
    expect(editor.document_container.graph.vertices[0].h_count).toBe(3);
    fire_key("C", { shiftKey: true });
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("Cm");
});

test("Strip hydrogens", () => {
    fire({ x: 100, y: 100 }, "click");
    fire({ x: 100, y: 100 }, "click");
    expect(editor.document_container.graph.vertices.length).toBe(3);
    fire(editor.document_container.graph.vertices[2].coords, "mousemove");
    fire_key("H");
    fire({ x: 200, y: 200 }, "mousemove");
    fire_key(" ");
    fire_key("h");
    expect(editor.document_container.graph.vertices.length).toBe(2);
    fire_key("z", { ctrlKey: true });
    expect(editor.document_container.graph.vertices.length).toBe(3);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.document_container.graph.vertices.length).toBe(2);
});

test("Isotopes", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.document_container.graph.vertices.length).toBe(2);
    expect(editor.document_container.graph.vertices[0].isotope).toBe(0);
    fire(editor.document_container.graph.vertices[0].coords, "mousemove");
    fire_key(" ");
    fire_key("i");
    fire_key("1");
    expect(editor.document_container.graph.vertices[0].isotope).toBe(12); // first isotope for C
    expect(editor.document_container.graph.vertices[0].label).toBe("C");
    fire_key(" ");
    fire_key("i");
    fire_key("2");
    expect(editor.document_container.graph.vertices[0].isotope).toBe(13); // second isotope for C
    fire_key(" ");
    fire_key("i");
    fire_key("x");
    expect(editor.document_container.graph.vertices[0].isotope).toBe(0);
    expect(editor.document_container.graph.vertices[0].label).toBe("C");
    expect(editor.document_container.graph.vertices[0].visible_text).toBe("");
    fire_key("H");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("H");
    expect(editor.document_container.graph.vertices[0].isotope).toBe(0); // change atom
    fire_key(" ");
    fire_key("i");
    fire_key("1");
    expect(editor.document_container.graph.vertices[0].isotope).toBe(1); // first isotope for H
    fire_key("C");
    expect(editor.document_container.graph.vertices[0].element?.symbol).toBe("C");
    expect(editor.document_container.graph.vertices[0].label).toBe("C");
    expect(editor.document_container.graph.vertices[0].visible_text).toBe("");
    expect(editor.document_container.graph.vertices[0].isotope).toBe(0); // change atom should change isotope
});
