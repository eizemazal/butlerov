import { editor, fire, fire_key } from "../src/lib/testing";
import { SmilesConverter } from "../src/converter/SmilesConverter";

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
    const clipboard = editor.clipboard;
    expect(clipboard).not.toBeNull();
    if (!clipboard)
        throw new Error("expected clipboard after copy");
    expect(clipboard.graph.vertices.length).toBe(2);
    expect(clipboard.graph.edges.length).toBe(1);
    expect(clipboard.anchor_vertex_index).toBe(1);
    expect(clipboard.anchor_edge_index).toBeNull();
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
    const clipboardEdge = editor.clipboard;
    expect(clipboardEdge).not.toBeNull();
    if (!clipboardEdge)
        throw new Error("expected clipboard after copy");
    expect(clipboardEdge.anchor_vertex_index).toBeNull();
    expect(clipboardEdge.anchor_edge_index).toBe(0);
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

test("Backspace or Delete removes selected atoms", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    expect(editor.selection_vertices.size).toBe(2);

    fire_key("Backspace");
    expect(g.vertices.length).toBe(0);
    expect(editor.has_selection()).toBe(false);

    fire({ x: 100, y: 100 }, "click");
    editor.select_linked_component(editor.document_container.graph.vertices[0]);
    fire_key("Delete");
    expect(editor.document_container.graph.vertices.length).toBe(0);
    expect(editor.has_selection()).toBe(false);
});

test("Escape clears selection and closes menu", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    expect(editor.has_selection()).toBe(true);

    fire_key("Escape");
    expect(editor.has_selection()).toBe(false);

    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    fire_key(" ");
    expect(editor.menu.visible).toBe(true);
    fire_key("Escape");
    expect(editor.menu.visible).toBe(false);
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

test("selection menu includes Delete (x) when hovering selection", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    fire_key(" ");
    expect(editor.menu.visible).toBe(true);
    fire_key("x");
    expect(editor.menu.visible).toBe(false);
    expect(g.vertices.length).toBe(0);
    expect(g.edges.length).toBe(0);
});

test("Selection submenu: s then a selects linked like before", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    fire_key(" ");
    expect(editor.menu.visible).toBe(true);
    fire_key("s");
    expect(editor.menu.visible).toBe(true);
    fire_key("a");
    expect(editor.menu.visible).toBe(false);
    expect(editor.has_selection()).toBe(true);
    expect(editor.selection_vertices.size).toBe(2);
});

test("selection_offers_chain / ring on default fragment vs benzene", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    g.update_topology();
    expect(editor.selection_offers_chain(g.vertices[0])).toBe(true);
    expect(editor.selection_offers_ring(g.vertices[0])).toBe(false);

    editor.clear(false);
    editor.graph = new SmilesConverter().graph_from_string("c1ccccc1");
    const g2 = editor.document_container.graph;
    g2.update_topology();
    expect(editor.selection_offers_ring(g2.vertices[0])).toBe(true);
    expect(editor.selection_offers_chain(g2.vertices[0])).toBe(false);
});

test("select_chain_component on alkane selects full chain", () => {
    editor.graph = new SmilesConverter().graph_from_string("CCCC");
    const g = editor.document_container.graph;
    g.update_topology();
    editor.select_chain_component(g.vertices[1]);
    expect(editor.selection_vertices.size).toBe(4);
    expect(editor.selection_edges.size).toBe(3);
});

test("select_ring_component on benzene selects the ring", () => {
    editor.graph = new SmilesConverter().graph_from_string("c1ccccc1");
    const g = editor.document_container.graph;
    g.update_topology();
    editor.select_ring_component(g.vertices[0]);
    expect(editor.selection_vertices.size).toBe(6);
    expect(editor.selection_edges.size).toBe(6);
});

test("Ctrl+C without selection copies hovered vertex fragment with anchor", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    expect(editor.has_selection()).toBe(false);
    fire_key("c", { ctrlKey: true });
    expect(editor.clipboard).not.toBeNull();
    expect(editor.clipboard?.graph.vertices.length).toBe(2);
    expect(editor.clipboard?.anchor_vertex_index).toBe(0);
});

test("Ctrl+C with selection still copies selection", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    editor.select_linked_component(g.vertices[0]);
    fire({ x: g.vertices[1].x, y: g.vertices[1].y }, "mousemove");
    fire_key("c", { ctrlKey: true });
    expect(editor.clipboard?.anchor_vertex_index).toBe(1);
});

test("Ctrl+V on active vertex runs paste-over when clipboard has vertex anchor", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    fire_key("c", { ctrlKey: true });
    const before = JSON.stringify(editor.graph);

    fire({ x: 220, y: 180 }, "click");
    const g2 = editor.document_container.graph;
    expect(g2.vertices.length).toBe(4);
    const target = g2.vertices[3];
    fire({ x: target.x, y: target.y }, "mousemove");
    expect(editor.active_vertex).toBe(target);

    fire_key("v", { ctrlKey: true });
    expect(JSON.stringify(editor.graph)).not.toBe(before);
});

test("Ctrl+V on active edge runs paste-over when clipboard has vertex anchor", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    fire({ x: g.vertices[0].x, y: g.vertices[0].y }, "mousemove");
    fire_key("c", { ctrlKey: true });
    const before = JSON.stringify(editor.graph);

    fire({ x: 220, y: 180 }, "click");
    const g2 = editor.document_container.graph;
    expect(g2.edges.length).toBe(2);
    const e2 = g2.edges[1];
    const mx = (e2.v1.coords.x + e2.v2.coords.x) / 2;
    const my = (e2.v1.coords.y + e2.v2.coords.y) / 2;
    fire({ x: mx, y: my }, "mousemove");
    expect(editor.active_edge).toBe(e2);

    fire_key("v", { ctrlKey: true });
    expect(JSON.stringify(editor.graph)).not.toBe(before);
});

test("edge key s opens Selection submenu", () => {
    fire({ x: 100, y: 100 }, "click");
    const g = editor.document_container.graph;
    const bond = g.edges[0];
    const mx = (bond.v1.coords.x + bond.v2.coords.x) / 2;
    const my = (bond.v1.coords.y + bond.v2.coords.y) / 2;
    fire({ x: mx, y: my }, "mousemove");
    expect(editor.active_edge).toBe(bond);
    fire_key("s");
    expect(editor.menu.visible).toBe(true);
    fire_key("Escape");
});
