import {editor, fire_key, fire} from "../src/lib/testing";

beforeEach( () => {
    editor.clear();
});

test("Symmetrize along edge", () => {
    fire({x: 100, y: 100}, "click");
    fire(editor.graph.vertices[0].coords, "mousemove");
    fire(editor.graph.vertices[0].coords, "click");
    expect(editor.graph.vertices.length).toBe(3);
    fire(editor.graph.vertices[2].coords, "mousemove");
    fire_key("S");
    expect(editor.graph.vertices[2].element?.symbol).toBe("S");
    expect(editor.graph.vertices[2].h_count).toBe(1);
    expect(editor.graph.vertices[2].charge).toBe(0);
    const edge_center = {
        x: (editor.graph.vertices[0].coords.x + editor.graph.vertices[1].coords.x) / 2,
        y: (editor.graph.vertices[0].coords.y + editor.graph.vertices[1].coords.y) / 2,
    };
    fire(edge_center, "mousemove");
    fire_key(" ");
    fire_key("s");
    expect(editor.graph.vertices.length).toBe(4);
    expect(editor.graph.vertices[3].element?.symbol).toBe("S");
    expect(editor.graph.vertices[3].h_count).toBe(1);
    expect(editor.graph.vertices[3].charge).toBe(0);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(3);
    fire_key("y", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(4);
});


test("Graph rotation", () => {
    fire({x: 100, y: 100}, "click");
    const x0 = editor.graph.vertices[0].coords.x;
    const x1 = editor.graph.vertices[1].coords.x;
    const y0 = editor.graph.vertices[0].coords.y;
    const y1 = editor.graph.vertices[1].coords.y;
    const edge_center = {
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
    };
    editor.graph.rotate(edge_center, Math.PI);
    expect(editor.graph.vertices[0].coords.x).toBeCloseTo(x1);
    expect(editor.graph.vertices[0].coords.y).toBeCloseTo(y1);
    expect(editor.graph.vertices[1].coords.x).toBeCloseTo(x0);
    expect(editor.graph.vertices[1].coords.y).toBeCloseTo(y0);
});


test("Symmetrize vertex", () => {
    fire({x: 100, y: 100}, "click");
    fire(editor.graph.vertices[1].coords, "mousemove");
    fire_key("f");
    fire(editor.graph.vertices[0].coords, "mousemove");
    fire_key(" ");
    fire_key("s");
    fire_key("3");
    expect(editor.graph.vertices.length).toBe(4);
    expect(editor.graph.vertices.filter(e => e.element?.symbol == "F" ).length).toBe(3);
    expect(editor.graph.edges.length).toBe(3);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    fire_key("y", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(4);
});