import { DrawableGraph } from "../drawables/Graph";
import { DrawableVertex } from "../drawables/Vertex";
import { ChemicalElements } from "../lib/elements";
import { Converter, EdgeShape } from "../types";


/**
 * Converter class for SMILES
 */
export class SmilesConverter implements Converter {
    graph: DrawableGraph = new DrawableGraph();
    label = "";
    attachment_stack: DrawableVertex[] = [];
    element_symbol = "";
    bond_order = 1;
    labels: Record<string, DrawableVertex> = {};

    graph_from_string(s: string): DrawableGraph {
        this.graph = new DrawableGraph();
        this.reset();
        this._parse(s);
        this.graph.update_topology();
        this.graph.edges.forEach(e => { this.graph.update_edge_orientation(e); });
        return this.graph;
    }

    graph_to_string = undefined;

    _parse(smiles: string): void {
        const lowercase_list = "(?:b|c|n|o|p|s)";
        const re_lowercase = /^(?:b|c|n|o|p|s)/;
        const re_organic = /^(?:Cl|Br|F|I|B|C|N|O|P|S)/;
        // prepare a regexp matching chemical element symbol, sort by length to make Cl match before C
        const element_list = "(?:" + Object.keys(ChemicalElements).sort((a, b) => b.length - a.length).join("|") + ")";
        const re_atom_square_brackets = `^\\[(${element_list}|${lowercase_list})(@{1,2})?(H\\d{0,})?([+-]\\d{0,})?\\]`;
        const re_label = /^(%\d{2,}|\d)+/;

        let i = 0;
        while (i < smiles.length) {
            if (smiles[i] == "(") {
                if (!this.attachment_stack) {
                    throw "( cannot be the first symbol of SMILES";
                }
                this.attachment_stack.push(this.attachment_stack[this.attachment_stack.length - 1]);
                i += 1;
                continue;
            }
            if (smiles[i] == ")") {
                if (!this.attachment_stack) {
                    throw "Extraneous ) in SMILES";
                }
                this.attachment_stack.pop();
                i += 1;
                continue;
            }
            if (smiles[i] == "=") {
                this.bond_order = 2;
                i += 1;
                continue;
            }
            if (smiles[i] == "#") {
                this.bond_order = 3;
                i += 1;
                continue;
            }
            if (smiles[i] == "/" || smiles[i] == "\\") {
                /// FIXME ignore cis-trans for now
                i += 1;
                continue;
            }

            let match = smiles.substring(i).match(re_organic);
            if (match) {
                this.element_symbol = match[0];
                this.attach();
                i += match[0].length;
                continue;
            }
            match = smiles.substring(i).match(re_lowercase);
            if (match) {
                this.element_symbol = match[0].toUpperCase();
                this.attach();
                i += match[0].length;
                continue;
            }
            match = smiles.substring(i).match(re_atom_square_brackets);
            if (match) {
                this.element_symbol = match[1];
                // aromatic symbols can be encountered here as [nH] too
                if (this.element_symbol.length == 1 && this.element_symbol.toLowerCase() == this.element_symbol)
                    this.element_symbol = this.element_symbol.toUpperCase();
                // [ "[Na@@H2+2]", "Na", "@@", "H2", "+2" ]
                this.attach();
                // convert + or - to +1/-1
                if (match[4])
                    this.attachment_stack[this.attachment_stack.length - 1].charge = parseInt(match[4].length == 1 ? match[4] + "1" : match[4]);
                i += match[0].length;
                continue;
            }
            match = smiles.substring(i).match(re_label);
            if (match) {
                if (!this.attachment_stack.length)
                    throw "Label must follow atom in SMILES string";
                const labels = match[0].match(/(%\d{2,}|\d)/g) || [];
                for (let j = 0; j < labels.length; j++) {
                    if (labels[j] in this.labels)
                        this.graph.bind_vertices(this.labels[labels[j]], this.attachment_stack[this.attachment_stack.length - 1]);
                    else
                        this.labels[labels[j]] = this.attachment_stack[this.attachment_stack.length - 1];
                }
                i += match[0].length;
                continue;
            }
            throw `Unknown symbol ${smiles[i]} at position ${i}`;
        }
    }
    attach() {
        const attach_to = this.attachment_stack.pop();
        const added = attach_to ? this.graph.add_chain(attach_to, 1) : this.graph.add_vertex({ x: 100, y: 100 }, this.element_symbol);
        this.attachment_stack.push(added.vertices[0]);
        added.vertices[0].label = this.element_symbol;
        if (this.bond_order == 2)
            added.edges[0].shape = EdgeShape.Double;
        if (this.bond_order == 3)
            added.edges[0].shape = EdgeShape.Triple;
        this.element_symbol = "";
        this.bond_order = 1;
    }

    reset() {
        this.element_symbol = "";
        this.attachment_stack = [];
        this.bond_order = 1;
        this.label = "";
        this.labels = {};
    }
}