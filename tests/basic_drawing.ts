import { ChemicalElements } from "../src/lib/elements";
import {editor, fire_key, fire} from "../src/lib/testing";

beforeEach( () => {
    editor.clear();
});

test("Add default fragment and clear it", () => {
    expect(editor.empty).toBe(true);
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect(editor.empty).toBe(false);
    fire_key("z", {ctrlKey: true});
    expect(editor.empty).toBe(true);
    fire_key("y", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
});

test("Add single vertex and clear it", () => {
    expect(editor.empty).toBe(true);
    fire({x: 100, y: 100}, "click", {button: 1, ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(1);
    expect(editor.graph.edges.length).toBe(0);
    expect(editor.empty).toBe(false);
    fire_key("z", {ctrlKey: true});
    expect(editor.empty).toBe(true);
    fire_key("y", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(1);
    expect(editor.graph.edges.length).toBe(0);
});

test("Draw neopentane", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect(editor.graph.vertices[0].coords).toStrictEqual({x: 100, y: 100});
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(3);
    expect(editor.graph.edges.length).toBe(2);
    fire_key("z", {metaKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("y", {metaKey: true});
    expect(editor.graph.vertices.length).toBe(3);
    expect(editor.graph.edges.length).toBe(2);
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(4);
    expect(editor.graph.edges.length).toBe(3);
    fire(editor.graph.vertices[1].coords, "mousemove");
    expect(editor.graph.vertices[1].active).toBe(true);
    fire({x: 0, y: 0 }, "mousemove");
    expect(editor.graph.vertices[1].active).toBe(false);
});

test("Attach ring", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire(editor.graph.vertices[0].coords, "mousemove");
    fire_key(" ");
    fire_key("R");
    fire_key("5");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
});


test("Draw hexanol, undo, redo", () => {
    fire({x: 124, y: 132}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire(editor.graph.vertices[1].coords, "mousemove");
    expect(editor.active_vertex).toBe(editor.graph.vertices[1]);
    fire_key(" ");
    fire_key("C");
    fire_key("5");
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["C"]);
    fire(editor.graph.vertices[0].coords, "mousemove");
    fire_key("O");
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["O"]);
    fire_key("O");
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["Os"]);
    fire_key("O");
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["O"]);
    fire({x: 1, y: 1}, "mousemove");
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["C"]);
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(0);
    expect(editor.graph.edges.length).toBe(0);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["C"]);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["O"]);
});

test("Draw and delete vertices and edges", () => {
    fire({x: 200, y: 200}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    const edge_center = {
        x: (editor.graph.vertices[0].coords.x + editor.graph.vertices[1].coords.x) / 2,
        y: (editor.graph.vertices[0].coords.y + editor.graph.vertices[1].coords.y) / 2,
    };
    fire(edge_center, "mousemove");
    fire_key(" ");
    fire_key("R");
    fire_key("6");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire(editor.graph.vertices[3].coords, "mousemove");
    fire_key("Delete");
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(4);
    fire_key("z", {metaKey: true});
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("y", {metaKey: true});
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(4);
    fire_key("z", {metaKey: true});
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire(edge_center, "mousemove");
    fire_key("Delete");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(5);
    fire_key("z", {metaKey: true});
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", {metaKey: true, shiftKey: true});
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(5);
});

test("Drag vertex", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    const old_coords = JSON.parse(JSON.stringify(editor.graph.vertices[1].coords));
    const edge_len = editor.graph.edges[0].screen_length;
    fire(old_coords, "mousedown");
    fire({x: 105, y: 5}, "mousemove");
    fire({x: 105, y: 5}, "mouseup");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.vertices[1].coords.x).toBeCloseTo(editor.graph.vertices[0].coords.x);
    expect(editor.graph.edges[0].screen_length).toBeCloseTo(edge_len);
    fire_key("z", { ctrlKey: true } );
    expect(editor.graph.vertices[1].coords.x).toBeCloseTo(old_coords.x);
    expect(editor.graph.vertices[1].coords.y).toBeCloseTo(old_coords.y);
    expect(editor.graph.edges[0].screen_length).toBeCloseTo(edge_len);
    fire_key("y", { ctrlKey: true } );
    expect(editor.graph.vertices[1].coords.x).toBeCloseTo(editor.graph.vertices[0].coords.x);
    expect(editor.graph.edges[0].screen_length).toBeCloseTo(edge_len);
    fire(editor.graph.vertices[1].coords, "mousemove");
    fire(editor.graph.vertices[1].coords, "mousedown");
    fire({x: 250, y: editor.graph.vertices[0].coords.y}, "mousemove");
    fire({x: 250, y: editor.graph.vertices[0].coords.y}, "mouseup");
    expect(editor.graph.vertices[1].coords.y).toBeCloseTo(editor.graph.vertices[0].coords.y);
    expect(editor.graph.edges[0].screen_length).toBeCloseTo(edge_len);
});

test("Bind vertices, undo, redo", () => {
    fire({x: 100, y: 100}, "click");
    fire({x: 200, y: 200}, "click");
    expect(editor.graph.vertices.length).toBe(4);
    expect(editor.graph.edges.length).toBe(2);
    fire({x: 100, y: 100}, "mousemove");
    fire({x: 100, y: 100}, "mousedown");
    fire({x: 150, y: 150}, "mousemove");
    fire({x: 203, y: 198}, "mousemove");
    fire({x: 204, y: 197}, "mouseup");
    expect(editor.graph.edges.length).toBe(3);
    expect(editor.graph.vertices.length).toBe(4);
    fire_key("z", { ctrlKey: true } );
    expect(editor.graph.edges.length).toBe(2);
    fire_key("y", { ctrlKey: true } );
    expect(editor.graph.edges.length).toBe(3);
});