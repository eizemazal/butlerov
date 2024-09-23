import { Graph } from "../drawable/Graph";
import { Abbreviations } from "../lib/abbreviations";
import { ChemicalElements } from "../lib/elements";
import { AtomicLinearFormulaFragment, LinearFormulaFragment, AbbreviatedLinearFormulaFragment, CompositeLinearFormulaFragment } from "../lib/linear";
import { Converter } from "./Converter";

/**
 * Converter class for linear formulae like CF3SO2ONa
 * They are acyclic
 */
export class LinearFormulaConverter extends Converter {
    graph : Graph = new Graph();
    fragments: LinearFormulaFragment[] = [];

    from_string(s: string, graph: Graph | null): Graph {
        this.graph = graph ? graph : new Graph();
        const controller = this.graph.controller;
        if (controller)
            this.graph.detach();
        this.graph.clear();
        this.fragments = [];
        this.fragments = this.tokenize(s);
        this.graph = this.build_graph(this.fragments);
        if (controller) {
            const scaling_factor = this.graph.get_average_bond_distance() / controller.stylesheet.bond_length_px;
            this.graph.mol_scaling_factor = scaling_factor;
            this.graph.vertices.forEach( e => {
                e.coords = { x: e.coords.x / scaling_factor, y: e.coords.y / scaling_factor };
            });
            this.graph.attach(controller);
        }
        this.graph.update_topology();
        this.graph.edges.forEach(e => {this.graph.update_edge_orientation(e);});
        return this.graph;
    }

    build_graph(fragments: LinearFormulaFragment[]): Graph {
        return new CompositeLinearFormulaFragment(fragments).to_graph();
    }

    tokenize(s: string): LinearFormulaFragment[] {
        const fragments = [];
        const tokens = new Set(Object.keys(ChemicalElements).concat( Object.keys(Abbreviations)));
        let max_token_length = 0;
        for (const token of tokens) {
            if (token.length > max_token_length)
                max_token_length = token.length;
        }

        let i = 0;
        while (i < s.length) {
            for (let j = Math.min(max_token_length, s.length - i); j > 0; j--) {
                const chunk = s.substring(i, i+j);
                if ( tokens.has(chunk)) {
                    let frag;
                    if (chunk in Abbreviations) {
                        frag = new AbbreviatedLinearFormulaFragment(Abbreviations[chunk], chunk);
                        i += chunk.length;
                    }
                    else if (chunk in ChemicalElements) {
                        frag = new AtomicLinearFormulaFragment(ChemicalElements[chunk], chunk);
                        i += chunk.length;
                        let matches = s.substring(i).match(/^H(\d*)/);
                        if (matches) {
                            i += matches[0].length;
                            if (matches[1])
                                frag.n_hydrogens = parseInt(matches[1]);
                            else
                                frag.n_hydrogens = 1;
                            frag.text += matches[0];
                        }
                        const max_valency = Math.max(...frag.element.valences);
                        let residual_valency = max_valency - frag.n_hydrogens;
                        // if not at the beginning of line, count for one valency
                        if (i != chunk.length)
                            residual_valency -= 1;
                        const subfrags = [];
                        while (max_valency >= residual_valency) {
                            let nothing_more = true;
                            matches = s.substring(i).match(/^(F|Cl|Br|I)(\d*)/);
                            if (matches) {
                                i += matches[0].length;
                                const nfound = parseInt(matches[2]);
                                const element = ChemicalElements[matches[1]];
                                const subfragment = new AtomicLinearFormulaFragment(element, matches[0]);
                                subfragment.count = nfound;
                                subfrags.push(subfragment);
                                residual_valency -= nfound;
                                nothing_more = false;
                            }
                            matches = s.substring(i).match(/^O(\d*)/);
                            if (matches) {
                                const nfound = matches[1] ? parseInt(matches[1]) : 1;
                                if (residual_valency < 2 * nfound)
                                    break;
                                i += matches[0].length;
                                const subfragment = new AtomicLinearFormulaFragment(ChemicalElements["O"], matches[0]);
                                subfragment.count = nfound;
                                subfragment.bond_order = 2;
                                subfrags.push(subfragment);
                                residual_valency -= 2 * nfound;
                                nothing_more = false;
                            }
                            if (nothing_more)
                                break;
                        }
                        if (subfrags.length) {
                            frag = new CompositeLinearFormulaFragment([frag, ...subfrags], frag.text + subfrags.map(e => e.text).join(""));
                        }
                        matches = s.substring(i).match(/^(\d*)(\+|-)/);
                        if (matches) {
                            i += matches[0].length;
                            let charge = 0;
                            if (matches[1])
                                charge = parseInt(matches[1].substring(1, matches[1].length -1));
                            else
                                charge = 1;
                            charge *= (matches[2] == "+" ? 1 : -1);
                            frag.charge = charge;
                            frag.text += matches[0];
                        }
                    }
                    if (!frag) {
                        throw "Unexpected";
                    }
                    const matches = s.substring(i).match(/^\d+/);
                    if (matches) {
                        i += matches[0].length;
                        frag.count = parseInt(matches[0]);
                        frag.text += matches[0];
                    }
                    fragments.push(frag);
                    break;
                }
                else if (j == 1) {
                    const cut = s.length - i >= 10 ? s.substring(i, 10) + "..." : s.substring(i);
                    throw `Unable to parse linear formula starting from ${cut}`;
                }
            }
        }
        return fragments;
    }
}