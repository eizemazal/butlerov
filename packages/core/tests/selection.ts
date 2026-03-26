import { editor, fire, fire_key } from "../src/lib/testing";

beforeEach(() => {
    editor.clear();
});

test("select_linked_component selects the full connected fragment", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    expect(g.vertices.length).toBe(2);
    expect(g.edges.length).toBe(1);

    editor.select_linked_component(g.vertices[0]);
    expect(editor.has_selection()).toBe(true);
    expect(editor.selection_vertices.size).toBe(2);
    expect(editor.selection_edges.size).toBe(1);
    expect(g.vertices.every(v => editor.selection_vertices.has(v))).toBe(true);
    expect(g.edges.every(e => editor.selection_edges.has(e))).toBe(true);
    expect(g.vertices.every(v => v.selected)).toBe(true);
    expect(g.edges.every(e => e.selected)).toBe(true);

    const d = editor.selection_descriptor;
    expect(d.vertexIndices.length).toBe(2);
    expect(d.edgeIndices.length).toBe(1);
    expect(new Set(d.vertexIndices)).toEqual(new Set([0, 1]));
    expect(d.edgeIndices).toEqual([0]);
});

test("commit_action clears selection", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    expect(editor.has_selection()).toBe(true);

    fire({ x: 40, y: 40 }, "click");
    expect(editor.has_selection()).toBe(false);
    expect(g.vertices.every(v => !v.selected)).toBe(true);
    expect(g.edges.every(e => !e.selected)).toBe(true);
});

test("copy_selection_to_clipboard stores graph, anchor on hovered vertex, and clears selection", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    fire({ x: g.vertices[1].x, y: g.vertices[1].y }, "mousemove");
    expect(editor.active_vertex).toBe(g.vertices[1]);

    editor.copy_selection_to_clipboard();
    expect(editor.has_selection()).toBe(false);
    expect(editor.clipboard).not.toBeNull();
    expect(editor.clipboard!.graph.vertices.length).toBe(2);
    expect(editor.clipboard!.graph.edges.length).toBe(1);
    expect(editor.clipboard!.anchor_vertex_index).toBe(1);
    expect(editor.clipboard!.anchor_edge_index).toBeNull();
});

test("copy_selection_to_clipboard anchors on hovered edge", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    const bond = g.edges[0];
    editor.select_linked_component(g.vertices[0]);
    const mx = (bond.v1.coords.x + bond.v2.coords.x) / 2;
    const my = (bond.v1.coords.y + bond.v2.coords.y) / 2;
    fire({ x: mx, y: my }, "mousemove");
    expect(editor.active_edge).toBe(bond);

    editor.copy_selection_to_clipboard();
    expect(editor.clipboard!.anchor_vertex_index).toBeNull();
    expect(editor.clipboard!.anchor_edge_index).toBe(0);
});

test("paste at pointer merges a copied fragment", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    editor.copy_selection_to_clipboard();
    expect(editor.clipboard).not.toBeNull();

    fire({ x: 220, y: 180 }, "mousemove");
    editor.paste_clipboard_at_pointer();
    expect(editor.graph.vertices.length).toBe(4);
    expect(editor.graph.edges.length).toBe(2);
});

test("clear wipes clipboard", () => {
    fire({ x: 100, y: 100 }, "click");
    editor.select_linked_component(editor.document_container.graph.vertices[0]);
    fire(
        { x: editor.document_container.graph.vertices[0].x, y: editor.document_container.graph.vertices[0].y },
        "mousemove",
    );
    editor.copy_selection_to_clipboard();
    expect(editor.clipboard).not.toBeNull();

    editor.clear(false);
    expect(editor.clipboard).toBeNull();
});

test("space opens selection menu when hovering selected atom", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    expect(editor.menu.visible).toBe(false);

    fire_key(" ");
    expect(editor.menu.visible).toBe(true);
    fire_key("Escape");
    expect(editor.menu.visible).toBe(false);
});
