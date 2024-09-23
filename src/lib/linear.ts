import { ChemicalElement } from "./elements";
import { Abbreviation } from "./abbreviations";
import { LinearFormulaConverter } from "../converter/LinearFormula";
import { TextSegment } from "../drawable/SegmentedText";
import {format_charge } from "./common";
import { Graph } from "../drawable/Graph";
import { SmilesConverter } from "../main";
import { BondType } from "../drawable/Edge";

export class LinearFormulaFragment {
    text = "";
    count = 1;
    charge = 0;
    bond_order = 1;

    to_text_segments(): TextSegment[] { return []; }
    to_graph(): Graph { return new Graph(); }
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

    to_text_segments(): TextSegment[] {
        const segment = new TextSegment("");
        segment.text = this.element.symbol;
        if (this.n_hydrogens > 1 && this.count > 1) {
            segment.text = `(${this.element.symbol}H`;
            segment.index_rb = `${this.n_hydrogens}`;
            const segment2 = new TextSegment(")", `${this.count}`);
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

    to_graph(): Graph {
        const graph = new Graph();
        graph.add_vertex({x: 0, y: 0}, this.element.symbol);
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
    to_text_segments(): TextSegment[] {
        return [new TextSegment(this.abbreviation.symbol, this.count == 1 ? "" : `${this.count}`)];
    }
    to_graph(): Graph {
        return new SmilesConverter().from_string(this.abbreviation.smiles, null);
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

    to_text_segments(): TextSegment[] {
        let segments: TextSegment[] = [];
        for (const component of this.components) {
            let embrace = false;
            if (component instanceof CompositeLinearFormulaFragment && component.count != 1) {
                embrace = true;
                const obrace = new TextSegment("(");
                segments.push(obrace);
            }
            const component_segments = component.to_text_segments();
            if (embrace)
                component_segments.forEach(e => e.nobreak = true);
            segments = [...segments, ...component_segments];
            if (embrace) {
                const cbrace = new TextSegment(")", `${this.count}`);
                cbrace.nobreak = true;
                segments.push(cbrace);
            }
        }
        if (segments.length && this.charge)
            segments[segments.length-1].index_rt = format_charge(this.charge);
        return segments;
    }

    public get as_string() {
        return this.text ? this.text : this.components.map(e => e.text).join("");
    }

    public parse_string(text: string) {
        this.text = text;
        this.components = new LinearFormulaConverter().tokenize(text);
    }

    to_graph(): Graph {
        let i = 0;
        let graph;
        let last_vertex;
        while(i < this.components.length) {
            graph = this.components[i].to_graph();
            if (graph.vertices.length) {
                last_vertex = graph.vertices[0];
                break;
            }
            i++;
        }
        if (!graph || !last_vertex)
            return new Graph();

        for (let j = i+1; j < this.components.length; j++) {
            const component_graph = this.components[j].to_graph();
            if (!component_graph.vertices.length)
                continue;
            if (this.components[j].count == 1) {
                const new_last_vertex = component_graph.vertices[0];
                const edge = graph.combind(component_graph, last_vertex, component_graph.vertices[0]);
                if (this.components[j].bond_order == 2)
                    edge.bond_type = BondType.Double;
                last_vertex = new_last_vertex;
            }
            else
                for (let k = 0; k < this.components[j].count; k++) {
                    const copy = component_graph.copy();
                    const edge = graph.combind(copy, last_vertex, copy.vertices[0]);
                    if (this.components[j].bond_order == 2)
                        edge.bond_type = BondType.Double;
                }

        }
        return graph;
    }

}

export type LinearFormula = CompositeLinearFormulaFragment;