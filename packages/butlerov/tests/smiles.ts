import { ChemicalElements } from "../src/lib/elements";
import { SmilesConverter } from "../src/converter/SmilesConverter";
import { DrawableGraph } from "../src/drawables/Graph";

test("Read molecule from SMILES", () => {

    const cases = {
        "CCCCO": { edges: 4, vertices: 5, single: 4, elements: { C: 4, O: 1 }, ringsystems: 0 },
        "C(Cl)(Cl)(Cl)C(=O)Cl": { edges: 6, vertices: 7, single: 5, double: 1, elements: { C: 2, Cl: 4, O: 1 }, ringsystems: 0 },
        "CC[N+]": { edges: 2, vertices: 3, single: 2, elements: { C: 2, N: 1 }, ringsystems: 0 },
        "N#C[Cu-]C#N": { edges: 4, vertices: 5, single: 2, double: 0, triple: 2, elements: { C: 2, N: 2, Cu: 1 }, ringsystems: 0 },
        //"C1CCCC1": {edges: 5, vertices: 5, single: 5, double: 0, triple: 0, elements: {C: 5}, ringsystems: 1},
        //"c1ccccc1": {edges: 6, vertices: 6, single: 3, double: 3, triple: 0, elements: {C: 6}, ringsystems: 1},
    };

    for (const [smiles, descriptors] of Object.entries(cases)) {
        const graph = new DrawableGraph(new SmilesConverter().graph_from_string(smiles));
        expect(graph.vertices.length).toBe(descriptors.vertices);
        expect(graph.edges.length).toBe(descriptors.edges);
        expect(graph.edges.filter(e => e.bond_order == 1).length).toBe(descriptors.single);
        if ("double" in descriptors)
            expect(graph.edges.filter(e => e.bond_order == 2).length).toBe(descriptors.double);
        if ("triple" in descriptors)
            expect(graph.edges.filter(e => e.bond_order == 3).length).toBe(descriptors.triple);
        for (const [element, count] of Object.entries(descriptors.elements)) {
            expect(graph.vertices.filter(e => e.element == ChemicalElements[element]).length).toBe(count);
        }
        if ("ringsystems" in descriptors)
            expect(graph.ringsystems.length).toBe(descriptors.ringsystems);
    }
});
