import { ChemicalElement } from "./elements";
import { Abbreviation } from "./abbreviations";
import { LinearFormulaConverter } from "../converter/LinearFormula";
import { DrawableTextSegment } from "../drawables/SegmentedText";
import { format_charge } from "./common";
import { DrawableGraph } from "../drawables/Graph";
import { SmilesConverter } from "../converter/SmilesConverter";
import { EdgeShape } from "../types";

export class LinearFormulaFragment {
    text = "";
    count = 1;
    charge = 0;
    bond_order = 1;

    to_text_segments(): DrawableTextSegment[] { return []; }
    to_graph(): DrawableGraph { return new DrawableGraph(); }
}

/**
 * CH2, CH3+, Na+, O, etc
 */
export class AtomicLinearFormulaFragment extends LinearFormulaFragment {
    element: ChemicalElement;
    n_hydrogens = 0;

    constructor(element: ChemicalElement, text: string) {
        super();
        this.text = text;
        this.element = element;
    }

    to_text_segments(): DrawableTextSegment[] {
        const segment = new DrawableTextSegment("");
        segment.text = this.element.symbol;
        if (this.n_hydrogens > 1 && this.count > 1) {
            segment.text = `(${this.element.symbol}H`;
            segment.index_rb = `${this.n_hydrogens}`;
            const segment2 = new DrawableTextSegment(")", `${this.count}`);
            segment2.nobreak = true;
            if (this.charge)
                segment2.index_rt = `${this.charge}`;
            return [segment, segment2];
        }
        if (this.n_hydrogens) {
            segment.text += "H";
            if (this.n_hydrogens > 1)
                segment.index_rb = `${this.n_hydrogens}`;
        }
        if (this.count > 1)
            segment.index_rb = `${this.count}`;
        segment.index_rt = format_charge(this.charge);
        return [segment];
    }

    to_graph(): DrawableGraph {
        const graph = new DrawableGraph();
        graph.add_vertex({ x: 0, y: 0 }, this.element.symbol);
        graph.vertices[0].charge = this.charge;
        return graph;
    }
}

/**
 *  Boc, Tf etc
 */
export class AbbreviatedLinearFormulaFragment extends LinearFormulaFragment {
    abbreviation: Abbreviation;

    constructor(abbreviation: Abbreviation, text: string) {
        super();
        this.text = text;
        this.abbreviation = abbreviation;
    }
    to_text_segments(): DrawableTextSegment[] {
        return [new DrawableTextSegment(this.abbreviation.symbol, this.count == 1 ? "" : `${this.count}`)];
    }
    to_graph(): DrawableGraph {
        return new SmilesConverter().graph_from_string(this.abbreviation.smiles);
    }
}

/**
 * (CH2)2 etc
 */
export class CompositeLinearFormulaFragment extends LinearFormulaFragment {
    components: LinearFormulaFragment[];

    constructor(components: LinearFormulaFragment[] = [], text = "") {
        super();
        this.text = text;
        this.components = components;
    }

    to_text_segments(): DrawableTextSegment[] {
        let segments: DrawableTextSegment[] = [];
        for (const component of this.components) {
            let embrace = false;
            if (component instanceof CompositeLinearFormulaFragment && component.count != 1) {
                embrace = true;
                const obrace = new DrawableTextSegment("(");
                segments.push(obrace);
            }
            const component_segments = component.to_text_segments();
            if (embrace)
                component_segments.forEach(e => e.nobreak = true);
            segments = [...segments, ...component_segments];
            if (embrace) {
                const cbrace = new DrawableTextSegment(")", `${this.count}`);
                cbrace.nobreak = true;
                segments.push(cbrace);
            }
        }
        if (segments.length && this.charge)
            segments[segments.length - 1].index_rt = format_charge(this.charge);
        return segments;
    }

    public get as_string() {
        return this.text ? this.text : this.components.map(e => e.text).join("");
    }

    public parse_string(text: string) {
        this.text = text;
        this.components = new LinearFormulaConverter().tokenize(text);
    }

    to_graph(): DrawableGraph {
        let i = 0;
        let graph;
        let last_vertex;
        while (i < this.components.length) {
            graph = this.components[i].to_graph();
            if (graph.vertices.length) {
                last_vertex = graph.vertices[0];
                break;
            }
            i++;
        }
        if (!graph || !last_vertex)
            return new DrawableGraph();

        for (let j = i + 1; j < this.components.length; j++) {
            const component_graph = this.components[j].to_graph();
            if (!component_graph.vertices.length)
                continue;
            if (this.components[j].count == 1) {
                const new_last_vertex = component_graph.vertices[0];
                const edge = graph.combind(component_graph, last_vertex, component_graph.vertices[0]);
                if (this.components[j].bond_order == 2)
                    edge.shape = EdgeShape.Double;
                last_vertex = new_last_vertex;
            }
            else
                for (let k = 0; k < this.components[j].count; k++) {
                    const copy = component_graph.copy();
                    const edge = graph.combind(copy, last_vertex, copy.vertices[0]);
                    if (this.components[j].bond_order == 2)
                        edge.shape = EdgeShape.Double;
                }

        }
        return graph;
    }

}

export type LinearFormula = CompositeLinearFormulaFragment;