import { AddDefaultFragmentAction } from "../src/controller/Action";
import {editor, fire_key} from "../src/lib/testing";

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

