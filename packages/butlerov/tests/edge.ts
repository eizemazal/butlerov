import { EdgeShape, EdgeOrientation } from "../src/types";
import { editor, fire_key, fire } from "../src/lib/testing";

beforeEach(() => {
    editor.clear();
});

test("Draw cyclopentene, flip double bond", () => {
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(2);
    const edge_center = {
        x: (editor.graph.vertices[0].x + editor.document_container.graph.vertices[1].coords.x) / 2,
        y: (editor.graph.vertices[0].y + editor.document_container.graph.vertices[1].coords.y) / 2,
    };
    fire(edge_center, "mousemove");
    expect(editor.document_container.graph.edges[0].active).toBe(true);
    fire_key(" ");
    fire_key("R");
    fire_key("5");
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(5);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.vertices.length).toBe(2);
    expect(editor.graph.edges.length).toBe(1);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(5);
    expect([EdgeShape.Single, undefined]).toContain(editor.graph.edges[0].shape);
    fire(edge_center, "click");
    expect(editor.graph.edges[0].shape).toBe(EdgeShape.Double);
    expect(editor.document_container.graph.edges[0].orientation).toBe(EdgeOrientation.Left);
    fire({ x: 0, y: 0 }, "mousemove");
    fire(edge_center, "mousemove");
    fire_key("2");
    expect(editor.document_container.graph.edges[0].orientation).toBe(EdgeOrientation.Center);
    fire_key("z", { ctrlKey: true });
    expect(editor.document_container.graph.edges[0].orientation).toBe(EdgeOrientation.Left);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.document_container.graph.edges[0].orientation).toBe(EdgeOrientation.Center);
    fire(edge_center, "mousemove");
    fire_key("2");
    expect(editor.document_container.graph.edges[0].orientation).toBe(EdgeOrientation.Right);
    fire_key("z", { ctrlKey: true });
    expect(editor.document_container.graph.edges[0].orientation).toBe(EdgeOrientation.Center);
    fire_key("z", { ctrlKey: true, shiftKey: true });
    expect(editor.document_container.graph.edges[0].orientation).toBe(EdgeOrientation.Right);
});

test("Triple bond: draw HCN", () => {
    fire({ x: 200, y: 200 }, "click");
    expect(editor.document_container.graph.vertices.length).toBe(2);
    const edge_center = {
        x: (editor.document_container.graph.vertices[0].coords.x + editor.document_container.graph.vertices[1].coords.x) / 2,
        y: (editor.document_container.graph.vertices[0].coords.y + editor.document_container.graph.vertices[1].coords.y) / 2,
    };
    fire(edge_center, "click");
    expect(editor.graph.edges[0].shape).toBe(EdgeShape.Double);
    fire(edge_center, "click");
    expect(editor.graph.edges[0].shape).toBe(EdgeShape.Triple);
    fire_key("z", { ctrlKey: true });
    expect(editor.graph.edges[0].shape).toBe(EdgeShape.Double);
    fire_key("y", { ctrlKey: true });
    expect(editor.graph.edges[0].shape).toBe(EdgeShape.Triple);
    fire({ x: editor.graph.vertices[1].x, y: editor.graph.vertices[1].y }, "mousemove");
    fire_key("n");
    expect(editor.graph.vertices[1].label).toBe("N");
});

test("Draw and flip stereo bonds", () => {
    fire({ x: 100, y: 100 }, "click");
    fire({ x: 100, y: 100 }, "click");
    fire({ x: 100, y: 100 }, "click");
    fire({ x: 100, y: 100 }, "click");
    expect(editor.graph.vertices.length).toBe(5);
    expect(editor.graph.edges.length).toBe(4);
    const edge_center = {
        x: (editor.graph.vertices[0].x + editor.graph.vertices[1].x) / 2,
        y: (editor.graph.vertices[0].y + editor.graph.vertices[1].y) / 2,
    };
    fire(edge_center, "mousemove");
    fire_key("w");
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleUp).length).toBe(1);
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleDown).length).toBe(0);
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleEither).length).toBe(0);
    const edge = editor.document_container.graph.edges.find(e => e.shape == EdgeShape.SingleUp);
    const v1 = edge?.v1;
    const v2 = edge?.v2;
    fire_key("w");
    expect(edge?.v1).toBe(v2);
    expect(edge?.v2).toBe(v1);
    fire_key("z", { ctrlKey: true });
    expect(edge?.v1).toBe(v1);
    expect(edge?.v2).toBe(v2);
    fire({ x: 0, y: 0 }, "mousemove");
    fire(edge_center, "mousemove");
    fire_key(" ");
    fire_key("q");
    expect(edge?.v1).toBe(v1);
    expect(edge?.v2).toBe(v2);
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleUp).length).toBe(0);
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleDown).length).toBe(1);
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleEither).length).toBe(0);
    fire_key("q");
    expect(edge?.v1).toBe(v2);
    expect(edge?.v2).toBe(v1);
    fire_key("z", { ctrlKey: true });
    expect(edge?.v1).toBe(v1);
    expect(edge?.v2).toBe(v2);
    fire({ x: 0, y: 0 }, "mousemove");
    fire(edge_center, "mousemove");
    fire_key("e");
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleUp).length).toBe(0);
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleDown).length).toBe(0);
    expect(editor.document_container.graph.edges.filter(e => e.shape == EdgeShape.SingleEither).length).toBe(1);
    expect(edge?.v1).toBe(v1);
    expect(edge?.v2).toBe(v2);
    fire_key("e");
    expect(edge?.v1).toBe(v2);
    expect(edge?.v2).toBe(v1);
});
