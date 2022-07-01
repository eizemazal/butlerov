import {editor, fire_key, fire} from "../src/lib/testing";

beforeEach( () => {
    editor.clear();
});

test("Charges", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire(editor.graph.vertices[0].screen_coords, "mouseover");
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