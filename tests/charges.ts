import {editor, fire_key, fire} from "../src/lib/testing";

beforeEach( () => {
    editor.clear();
});

test("Charges", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire(editor.graph.vertices[0].coords, "mouseover");
    fire_key("+");
    expect(editor.graph.vertices[0].charge).toBe(1);
    fire_key("+");
    expect(editor.graph.vertices[0].charge).toBe(2);
    fire_key("-");
    fire_key("-");
    expect(editor.graph.vertices[0].charge).toBe(0);
    fire_key("-");
    expect(editor.graph.vertices[0].charge).toBe(-1);
    fire_key("-");
    expect(editor.graph.vertices[0].charge).toBe(-2);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices[0].charge).toBe(0);
});

test("Implicit H test", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire(editor.graph.vertices[0].coords, "mouseover");
    fire_key("N");
    expect(editor.graph.vertices[0].element?.symbol).toBe("N");
    expect(editor.graph.vertices[0].charge).toBe(0);
    expect(editor.graph.vertices[0].h_count).toBe(2);
    fire_key("+");
    expect(editor.graph.vertices[0].charge).toBe(1);
    expect(editor.graph.vertices[0].h_count).toBe(3);
    fire_key("-");
    expect(editor.graph.vertices[0].charge).toBe(0);
    expect(editor.graph.vertices[0].h_count).toBe(2);
    fire_key("-");
    expect(editor.graph.vertices[0].charge).toBe(-1);
    expect(editor.graph.vertices[0].h_count).toBe(1);
    fire_key("-");
    expect(editor.graph.vertices[0].charge).toBe(-2);
    expect(editor.graph.vertices[0].h_count).toBe(0);
    fire_key("-");
    expect(editor.graph.vertices[0].charge).toBe(-3);
    expect(editor.graph.vertices[0].h_count).toBe(0);
    fire_key("+");
    fire_key("+");
    fire_key("B");
    expect(editor.graph.vertices[0].element?.symbol).toBe("B");
    expect(editor.graph.vertices[0].charge).toBe(-1);
    expect(editor.graph.vertices[0].h_count).toBe(3);
});