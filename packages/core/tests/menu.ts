import { AddDefaultFragmentAction } from "../src/action/GraphActions";
import { editor, fire_key } from "../src/lib/testing";

beforeEach(() => {
    editor.clear();
});

test("Create and toggle menu", () => {
    expect(editor.document_container.graph.vertices.length).toBe(0);
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
    editor.commit_action(new AddDefaultFragmentAction(editor.document_container.graph, 100, 100));
    expect(editor.document_container.graph.vertices.length).toBe(2);
    expect(editor.document_container.graph.edges.length).toBe(1);
    fire_key(" ");
    fire_key("x");
    fire_key("n");
    expect(editor.document_container.graph.vertices.length).toBe(2);
    expect(editor.document_container.graph.edges.length).toBe(1);
    expect(editor.menu.visible).toBe(false);
    fire_key(" ");
    fire_key("x");
    fire_key("y");
    expect(editor.document_container.graph.vertices.length).toBe(0);
    expect(editor.document_container.graph.edges.length).toBe(0);
    expect(editor.menu.visible).toBe(false);
});

