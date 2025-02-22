import { editor, fire_key, fire } from "../src/lib/testing";
import { Composition } from "../src/descriptor/mw";
import userEvent from "@testing-library/user-event";

beforeEach(() => {
    editor.clear();
});

test("Add default fragment and clear it", () => {
    expect(editor.empty).toBe(true);
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect(editor.empty).toBe(false);
    fire_key("z", { ctrlKey: true });
    expect(editor.empty).toBe(true);
    fire_key("y", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
});

test("Add single vertex and clear it", () => {
    expect(editor.empty).toBe(true);
    fire({ x: 100, y: 100 }, "click", { button: 1, ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(1);
    expect(editor.graph.edges.length).toBe(0);
    expect(editor.empty).toBe(false);
    fire_key("z", { ctrlKey: true });
    expect(editor.empty).toBe(true);
    fire_key("y", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(1);
    expect(editor.graph.edges.length).toBe(0);
});

test("Draw neopentane", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect([editor.graph.vertices[0].x, editor.graph.vertices[0].y]).toStrictEqual([100, 100]);
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(3);
    expect(editor.graph.edges.length).toBe(2);
    fire_key("z", { metaKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("y", { metaKey: true });
    expect(editor.graph.vertices.length).toBe(3);
    expect(editor.graph.edges.length).toBe(2);
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(4);
    expect(editor.graph.edges.length).toBe(3);
    fire({ x: editor.graph.vertices[1].x, y: editor.graph.vertices[1].y }, "mousemove");
    expect(editor.document_container.graph.vertices[1].active).toBe(true);
    fire({ x: 0, y: 0 }, "mousemove");
    expect(editor.document_container.graph.vertices[1].active).toBe(false);
});

test("Attach ring", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire({ x: editor.graph.vertices[0].x, y: editor.graph.vertices[0].y }, "mousemove");
    fire_key(" ");
    fire_key("R");
    fire_key("5");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
});


test("Draw hexanol, undo, redo", () => {
    fire({ x: 124, y: 132 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    fire({ x: editor.graph.vertices[1].x, y: editor.graph.vertices[1].y }, "mousemove");
    expect(editor.active_vertex).toBe(editor.document_container.graph.vertices[1]);
    fire_key(" ");
    fire_key("C");
    fire_key("5");
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    expect(editor.graph.vertices[0].label).toBe("C");
    fire(editor.document_container.graph.vertices[0].coords, "mousemove");
    fire_key("O");
    expect(editor.graph.vertices[0].label).toBe("O");
    fire_key("O");
    expect(editor.graph.vertices[0].label).toBe("Os");
    fire_key("O");
    expect(editor.graph.vertices[0].label).toBe("O");
    fire({ x: 1, y: 1 }, "mousemove");
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices[0].label).toBe("C");
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(0);
    expect(editor.graph.edges.length).toBe(0);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.graph.vertices.length).toBe(7);
    expect(editor.graph.edges.length).toBe(6);
    expect(editor.graph.vertices[0].label).toBe("C");
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.graph.vertices[0].label).toBe("O");
});

test("Draw and delete vertices and edges", () => {
    fire({ x: 200, y: 200 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    const edge_center = {
        x: (editor.graph.vertices[0].x + editor.graph.vertices[1].x) / 2,
        y: (editor.graph.vertices[0].y + editor.graph.vertices[1].y) / 2,
    };
    fire(edge_center, "mousemove");
    fire_key(" ");
    fire_key("R");
    fire_key("6");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire({ x: editor.graph.vertices[3].x, y: editor.graph.vertices[3].y }, "mousemove");
    fire_key("Delete");
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(4);
    fire_key("z", { metaKey: true });
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("y", { metaKey: true });
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(4);
    fire_key("z", { metaKey: true });
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire(edge_center, "mousemove");
    fire_key("Delete");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(5);
    fire_key("z", { metaKey: true });
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    fire_key("z", { metaKey: true, shiftKey: true });
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(5);
});

test("Drag vertex", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    const old_coords = JSON.parse(JSON.stringify({ x: editor.graph.vertices[1].x, y: editor.graph.vertices[1].y }));
    const edge_len = editor.document_container.graph.edges[0].screen_length;
    fire(old_coords, "mousedown");
    fire({ x: 105, y: 5 }, "mousemove");
    fire({ x: 105, y: 5 }, "mouseup");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.vertices[1].x).toBeCloseTo(editor.document_container.graph.vertices[0].coords.x);
    expect(editor.document_container.graph.edges[0].screen_length).toBeCloseTo(edge_len);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices[1].x).toBeCloseTo(old_coords.x);
    expect(editor.graph.vertices[1].y).toBeCloseTo(old_coords.y);
    expect(editor.document_container.graph.edges[0].screen_length).toBeCloseTo(edge_len);
    fire_key("y", { ctrlKey: true });
    expect(editor.graph.vertices[1].x).toBeCloseTo(editor.document_container.graph.vertices[0].coords.x);
    expect(editor.document_container.graph.edges[0].screen_length).toBeCloseTo(edge_len);
    fire({ x: editor.graph.vertices[1].x, y: editor.graph.vertices[1].y }, "mousemove");
    fire({ x: editor.graph.vertices[1].x, y: editor.graph.vertices[1].y }, "mousedown");
    fire({ x: 250, y: editor.graph.vertices[0].y }, "mousemove");
    fire({ x: 250, y: editor.graph.vertices[0].y }, "mouseup");
    expect(editor.graph.vertices[1].y).toBeCloseTo(editor.document_container.graph.vertices[0].coords.y);
    expect(editor.document_container.graph.edges[0].screen_length).toBeCloseTo(edge_len);
});

test("Bind vertices, undo, redo", () => {
    fire({ x: 100, y: 100 }, "click");
    fire({ x: 200, y: 200 }, "click");
    expect(editor.graph.vertices.length).toBe(4);
    expect(editor.graph.edges.length).toBe(2);
    fire({ x: 100, y: 100 }, "mousemove");
    fire({ x: 100, y: 100 }, "mousedown");
    fire({ x: 150, y: 150 }, "mousemove");
    fire({ x: 203, y: 198 }, "mousemove");
    fire({ x: 204, y: 197 }, "mouseup");
    expect(editor.graph.edges.length).toBe(3);
    expect(editor.graph.vertices.length).toBe(4);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.edges.length).toBe(2);
    fire_key("y", { ctrlKey: true });
    expect(editor.graph.edges.length).toBe(3);
});


test("Add abbreviation via textbox and expand it", async () => {
    const ue = userEvent.setup();
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire({ x: editor.graph.vertices[0].x, y: editor.graph.vertices[0].y }, "mousemove");
    fire_key("Enter");
    expect(editor.text_box.visible).toBe(true);
    await ue.keyboard("OTf");
    expect(editor.text_box.value).toBe("OTf");
    fire_key("Enter");
    expect(editor.text_box.visible).toBe(false);
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect(editor.graph.vertices[0].label).toBe("OTf");
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices[0].label).toBe("C");
    expect(editor.document_container.graph.vertices[0].visible_text).toBe("");
    fire_key("y", { ctrlKey: true });
    expect(editor.graph.vertices[0].label).toBe("OTf");
    fire({ x: 100, y: 100 }, "mousemove");
    fire_key(" ");
    fire_key("P");
    expect(editor.graph.vertices.length).toBe(9);
    expect(editor.graph.edges.length).toBe(8);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.vertices[0].label).toBe("OTf");
    fire_key("y", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(9);
});

test("Readonly control", () => {
    expect(editor.empty).toBe(true);
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    expect(editor.readonly).toBe(false);
    editor.readonly = true;
    expect(editor.readonly).toBe(true);
    fire({ x: editor.graph.vertices[0].x, y: editor.graph.vertices[0].y }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    editor.readonly = false;
    expect(editor.readonly).toBe(false);
    fire({ x: editor.graph.vertices[0].x, y: editor.graph.vertices[0].y }, "click");
    expect(editor.graph.vertices.length).toBe(3);
});

test("Condensed ring drawing", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    let edge_center = {
        x: (editor.graph.vertices[0].x + editor.document_container.graph.vertices[1].coords.x) / 2,
        y: (editor.graph.vertices[0].y + editor.document_container.graph.vertices[1].coords.y) / 2,
    };
    fire(edge_center, "mousemove");
    expect(editor.document_container.graph.edges[0].active).toBe(true);
    fire_key(" ");
    fire_key("r");
    fire_key("p");
    expect(editor.graph.vertices.length).toBe(6);
    expect(editor.graph.edges.length).toBe(6);
    expect(new Composition(editor.graph).compute_as_string()).toBe("C6H6");
    edge_center = {
        x: (editor.graph.vertices[0].x + editor.document_container.graph.vertices[1].coords.x) / 2,
        y: (editor.graph.vertices[0].y + editor.document_container.graph.vertices[1].coords.y) / 2,
    };
    fire(edge_center, "mousemove");
    expect(editor.document_container.graph.edges[0].active).toBe(true);
    fire_key(" ");
    fire_key("r");
    fire_key("p");
    expect(editor.graph.vertices.length).toBe(10);
    expect(editor.graph.edges.length).toBe(11);
    expect(new Composition(editor.graph).compute_as_string()).toBe("C10H8");
    edge_center = {
        x: (editor.graph.vertices[1].x + editor.document_container.graph.vertices[2].coords.x) / 2,
        y: (editor.graph.vertices[1].y + editor.document_container.graph.vertices[2].coords.y) / 2,
    };
    fire(edge_center, "mousemove");
    expect(editor.document_container.graph.edges[1].active).toBe(true);
    fire_key(" ");
    fire_key("r");
    fire_key("p");
    expect(editor.graph.vertices.length).toBe(13);
    expect(editor.graph.edges.length).toBe(15);
    expect(new Composition(editor.graph).compute_as_string()).toBe("C13H10");
});