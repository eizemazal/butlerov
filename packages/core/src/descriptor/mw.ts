import { LabelType } from "../types";
import { ChemicalElements } from "../lib/elements";
import { Descriptor } from "./descriptor";
import { DrawableGraph } from "../main";


const H_MASS = ChemicalElements["H"].nuclides ? ChemicalElements["H"].nuclides[0].mass : 0;
// actually this is 0.0005486; but it is apparently compensated in MS software, so not using this correction
const ELECTRON_MASS = 0;

export class MW extends Descriptor {
    compute(): number {
        if (this.graph.vertices.some(e => e.label_type != LabelType.Atom && e.label_type !== undefined))
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

export class ExactMass extends Descriptor {
    compute(): number {
        if (this.graph.vertices.some(e => e.label_type != LabelType.Atom && e.label_type !== undefined))
            return NaN;
        /// FIXME - we need to recreate it from the model to compute h counts
        const dgraph = new DrawableGraph(this.graph);
        return dgraph.vertices.map(e => {
            if (e.label_type != LabelType.Atom)
                return 0;
            const element = ChemicalElements[e.label];
            if (element === undefined || !element.nuclides)
                return 0;

            let matching_nuclide = null;
            if (e.isotope) {
                matching_nuclide = element.nuclides.find(nuclide => nuclide.name == `${e.isotope}`);
                if (!matching_nuclide)
                    return 0;
            }
            else {
                const stable_nuclides = element.nuclides.filter(e => e.abundance > 0.0000000001);
                if (stable_nuclides.length == 0)
                    return 0;
                matching_nuclide = stable_nuclides[0];
            }
            return matching_nuclide.mass + e.h_count * H_MASS - e.charge * ELECTRON_MASS;
        }
        ).reduce((sum, e) => sum + e, 0);
    }
}

function format_charge_string(charge: number): string {
    if (charge === 0)
        return "";
    if (charge === 1)
        return "+";
    if (charge === -1)
        return "-";
    return `(${Math.abs(charge)}${charge > 0 ? "+" : "-"})`;
}

function format_charge_html(charge: number): string {
    if (charge === 0)
        return "";
    if (charge === 1)
        return "<sup>+</sup>";
    if (charge === -1)
        return "<sup>-</sup>";
    return `<sup>${Math.abs(charge)}${charge > 0 ? "+" : "-"}</sup>`;
}

export class Formula extends Descriptor {
    compute(): Map<string, number> {
        if (this.graph.vertices.some(e => e.label_type != LabelType.Atom && e.label_type !== undefined))
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
            if (order.indexOf(a[0]) !== -1) {
                return order.indexOf(b[0]) !== -1 ? order.indexOf(a[0]) - order.indexOf(b[0]) : -1;
            }
            else {
                return order.indexOf(b[0]) !== -1 ? 1 : (a[0] < b[0] ? -1 : 1);
            }
        }));
    }

    compute_as_string(): string {
        const formula = Array.from(this.compute()).filter(e => e[1] != 0).map(e => e[1] > 1 ? `${e[0]}${e[1]}` : e[0]).join("");
        const charge = this.graph.vertices.reduce((sum, v) => sum + (v.charge ?? 0), 0);
        return `${formula}${format_charge_string(charge)}`;
    }
    compute_as_html(): string {
        const formula = Array.from(this.compute()).filter(e => e[1] != 0).map(e => e[1] > 1 ? `${e[0]}<sub>${e[1]}</sub>` : e[0]).join("");
        const charge = this.graph.vertices.reduce((sum, v) => sum + (v.charge ?? 0), 0);
        return `${formula}${format_charge_html(charge)}`;
    }
}