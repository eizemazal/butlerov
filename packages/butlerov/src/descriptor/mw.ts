import { LabelType } from "../types";
import { ChemicalElements } from "../lib/elements";
import { Descriptor } from "./descriptor";
import { DrawableGraph } from "../main";

export class MW extends Descriptor {
    compute(): number {
        if (this.graph.vertices.some(e => e.label_type != LabelType.Atom))
            return NaN;
        /// FIXME - we need to recreate it from the model to compute h counts
        const dgraph = new DrawableGraph(this.graph);
        return dgraph.vertices.map(e => {
            if (e.label_type != LabelType.Atom || ChemicalElements[e.label] == undefined)
                return 0;
            if (e.isotope && ChemicalElements[e.label].isotopes[e.isotope])
                /// FIXME, this is wrong
                return e.isotope + (e.h_count ?? 0) * ChemicalElements["H"].atomic_mass;
            return ChemicalElements[e.label].atomic_mass + (e.h_count ?? 0) * ChemicalElements["H"].atomic_mass;
        }
        ).reduce((sum, e) => sum + e, 0);
    }
}

export class Composition extends Descriptor {
    compute(): Map<string, number> {
        if (this.graph.vertices.some(e => e.label_type != LabelType.Atom))
            return new Map();
        /// FIXME - we need to recreate it from the model to compute h counts
        const dgraph = new DrawableGraph(this.graph);
        const r = new Map<string, number>();
        dgraph.vertices.filter(e => e.label_type == LabelType.Atom).forEach(e => {
            const element = e.label;
            if (ChemicalElements[element] === undefined)
                return;
            const existing_count = r.get(element) || 0;
            r.set(element, existing_count + 1);
            const existing_h = r.get("H") || 0;
            r.set("H", existing_h + (e.h_count ?? 0));
        });

        return new Map(Array.from(r).sort((a, b) => {
            // these atoms will be ordered first as written in the array, and all the rest follow alphabetically
            const order = ["C", "H"];
            if (order.includes(a[0])) {
                return order.includes(b[0]) ? order.indexOf(a[0]) - order.indexOf(b[0]) : -1;
            }
            else {
                return order.includes(b[0]) ? 1 : (a[0] < b[0] ? -1 : 1);
            }
        }));
    }

    compute_as_string(): string {
        return Array.from(this.compute()).filter(e => e[1] != 0).map(e => e[1] > 1 ? `${e[0]}${e[1]}` : e[0]).join("");
    }
    compute_as_html(): string {
        return Array.from(this.compute()).filter(e => e[1] != 0).map(e => e[1] > 1 ? `${e[0]}<sub>${e[1]}</sub>` : e[0]).join("");
    }
}