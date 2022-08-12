import { AddDefaultFragmentAction } from "../src/controller/Action";
import { BondType, EdgeOrientation, EdgeShape } from "../src/view/Edge";
import { ChemicalElements } from "../src/lib/elements";
import {editor, fire_key, fire} from "../src/lib/testing";

beforeEach( () => {
    editor.clear();
});

test("Create and toggle menu", () => {
    expect(editor.graph.vertices.length).toBe(0);
    expect(editor.menu.visible).toBe(false);
    fire_key(" ");
    expect(editor.menu.visible).toBe(true);
    fire_key("Escape");
    expect(editor.menu.visible).toBe(false);
    fire_key(" ");
    expect(editor.menu.visible).toBe(true);
    fire_key(" ");
    expect(editor.menu.visible).toBe(false);
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

test("Add single atom and clear it", () => {
    expect(editor.empty).toBe(true);
    fire({x: 100, y: 100}, "click", {evt: {button: 1, ctrlKey: true}});
    expect(editor.graph.vertices.length).toBe(1);
    expect(editor.graph.edges.length).toBe(0);
    expect(editor.empty).toBe(false);
    fire_key("z", {ctrlKey: true});
    expect(editor.empty).toBe(true);
    fire_key("y", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(1);
    expect(editor.graph.edges.length).toBe(0);
});

test("Clear menu", () => {
    editor.commit_action(new AddDefaultFragmentAction(editor.graph, 100, 100));
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key(" ");
    fire_key("x");
    fire_key("n");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect(editor.menu.visible).toBe(false);
    fire_key(" ");
    fire_key("x");
    fire_key("y");
    expect(editor.graph.vertices.length).toBe(0);
    expect(editor.graph.edges.length).toBe(0);
    expect(editor.menu.visible).toBe(false);
});

test("Draw neopentane", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect(editor.graph.vertices[0].screen_coords).toStrictEqual({x: 100, y: 100});
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
    fire(editor.graph.vertices[1].screen_coords, "mouseover");
    expect(editor.graph.vertices[1].active).toBe(true);
    fire(editor.graph.vertices[1].screen_coords, "mouseout");
    expect(editor.graph.vertices[1].active).toBe(false);
});

test("Draw cyclopentene, flip double bond", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    const edge_center = {
        x: (editor.graph.vertices[0].screen_coords.x + editor.graph.vertices[1].screen_coords.x) / 2,
        y: (editor.graph.vertices[0].screen_coords.y + editor.graph.vertices[1].screen_coords.y) / 2,
    };
    fire(edge_center, "mouseover");
    expect(editor.graph.edges[0].active).toBe(true);
    fire_key(" ");
    fire_key("R");
    fire_key("5");
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(5);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(5);
    expect(editor.graph.edges[0].bond_type).toBe(BondType.Single);
    fire(edge_center, "click");
    expect(editor.graph.edges[0].bond_type).toBe(BondType.Double);
    expect(editor.graph.edges[0].orientation).toBe(EdgeOrientation.Right);
    fire(edge_center, "mouseover");
    fire_key("2");
    expect(editor.graph.edges[0].orientation).toBe(EdgeOrientation.Left);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.edges[0].orientation).toBe(EdgeOrientation.Right);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.edges[0].orientation).toBe(EdgeOrientation.Left);
    fire(edge_center, "mouseover");
    fire_key("2");
    expect(editor.graph.edges[0].orientation).toBe(EdgeOrientation.Center);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.edges[0].orientation).toBe(EdgeOrientation.Left);
    fire_key("z", {ctrlKey: true, shiftKey: true});
    expect(editor.graph.edges[0].orientation).toBe(EdgeOrientation.Center);
});

test("Attach ring", () => {
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire(editor.graph.vertices[0].screen_coords, "mouseover");
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

test("Draw HCN", () => {
    fire({x: 200, y: 200}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    const edge_center = {
        x: (editor.graph.vertices[0].screen_coords.x + editor.graph.vertices[1].screen_coords.x) / 2,
        y: (editor.graph.vertices[0].screen_coords.y + editor.graph.vertices[1].screen_coords.y) / 2,
    };
    fire(edge_center, "click");
    expect(editor.graph.edges[0].bond_type).toBe(BondType.Double);
    fire(edge_center, "click");
    expect(editor.graph.edges[0].bond_type).toBe(BondType.Triple);
    fire_key("z", {ctrlKey: true});
    expect(editor.graph.edges[0].bond_type).toBe(BondType.Double);
    fire_key("y", {ctrlKey: true});
    expect(editor.graph.edges[0].bond_type).toBe(BondType.Triple);
    fire(editor.graph.vertices[1].screen_coords, "mouseover");
    fire_key("n");
    expect(editor.graph.vertices[1].label).toBe("N");
});

test("Draw hexanol, undo, redo", () => {
    fire({x: 124, y: 132}, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire(editor.graph.vertices[1].screen_coords, "mouseover");
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
    fire(editor.graph.vertices[0].screen_coords, "mouseover");
    fire_key("O");
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["O"]);
    fire_key("O");
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["Os"]);
    fire_key("O");
    expect(editor.graph.vertices[0].element).toBe(ChemicalElements["O"]);
    fire(editor.graph.vertices[0].screen_coords, "mouseout");
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
        x: (editor.graph.vertices[0].screen_coords.x + editor.graph.vertices[1].screen_coords.x) / 2,
        y: (editor.graph.vertices[0].screen_coords.y + editor.graph.vertices[1].screen_coords.y) / 2,
    };
    fire(edge_center, "mouseover");
    fire_key(" ");
    fire_key("R");
    fire_key("6");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire(editor.graph.vertices[3].screen_coords, "mouseover");
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
    fire(edge_center, "mouseover");
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

test("Draw and flip stereo bonds", () => {
    fire({x: 100, y: 100}, "click");
    fire({x: 100, y: 100}, "click");
    fire({x: 100, y: 100}, "click");
    fire({x: 100, y: 100}, "click");
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(4);
    const edge_center = {
        x: (editor.graph.vertices[0].screen_coords.x + editor.graph.vertices[1].screen_coords.x) / 2,
        y: (editor.graph.vertices[0].screen_coords.y + editor.graph.vertices[1].screen_coords.y) / 2,
    };
    fire(edge_center, "mouseover");
    fire_key("w");
    expect(editor.graph.edges.filter(e => e.shape == EdgeShape.SingleUp).length).toBe(1);
    const edge = editor.graph.edges.find(e => e.shape == EdgeShape.SingleUp);
    const v1 = edge?.v1;
    const v2 = edge?.v2;
    fire_key("w");
    expect(edge?.v1).toBe(v2);
    expect(edge?.v2).toBe(v1);
    fire_key("z", {ctrlKey: true});
    expect(edge?.v1).toBe(v1);
    expect(edge?.v2).toBe(v2);
    fire(edge_center, "mouseover");
    fire_key(" ");
    fire_key("q");
    expect(editor.graph.edges.filter(e => e.shape == EdgeShape.SingleDown).length).toBe(1);
});
