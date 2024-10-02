import { LabelType } from "../drawable/Vertex";
import { ChemicalElements } from "../lib/elements";
import { Descriptor } from "./descriptor";

export class MW extends Descriptor {
    compute(): number {
        if (this.graph.vertices.some(e => e.label_type != LabelType.Atom))
            return NaN;
        return this.graph.vertices.map(e => {
            return (!e.element) ? 0 :
                e.element.atomic_mass + e.h_count * ChemicalElements["H"].atomic_mass;
        }
        ).reduce( (sum, e) => sum + e , 0);
    }
}

export class Composition extends Descriptor {
    compute(): Map<string, number> {
        const r: Map<string, number> = new Map();
        if (this.graph.vertices.some(e => e.label_type != LabelType.Atom))
            return new Map();
        this.graph.vertices.filter(e => e.label_type == LabelType.Atom).forEach( e => {
            const element = e.element?.symbol;
            if (!element)
                return;
            const existing_count = r.get(element) || 0;
            r.set(element, existing_count + 1);
            const existing_h = r.get("H") || 0;
            r.set("H", existing_h + e.h_count);
        });

        return new Map(Array.from(r).sort((a,b) => {
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
        return Array.from(this.compute()).filter(e => e[1] != 0).map( e => e[1] > 1 ? `${e[0]}${e[1]}` : e[0]).join("");
    }
    compute_as_html(): string {
        return Array.from(this.compute()).filter(e => e[1] != 0).map( e => e[1] > 1 ? `${e[0]}<sub>${e[1]}</sub>` : e[0]).join("");
    }
}