import { Graph } from "./Graph";
import { Vertex } from "./Vertex";
//import { ChemicalElements } from "../lib/elements";
import { BondType } from "./Edge";
import { ChemicalElements } from "../lib/elements";

/**
 * Finite state machine states
 */
enum State {
    // starting with this
    Base,
    // we consumed first letter of element like C in Cl or B in Br, not in square brackets
    BaseElementPending,
    // We consumed label like 1 in 12 and waiting for numbers to end
    BaseLabelPending,
    // we are entering atom specification like in [Au] after [
    EnterAtom,
    // parsing atom spec, after A in [Au]
    InsideAtomSymbolPending,
    // parsing atom spec, atom symbol parsed and added to graph
    InsideAtom,
}

const lowercase_aromatic_symbols = new Set(["b", "c", "n", "o", "p", "s"]);
const organic_symbols = new Set(["B", "C", "N", "O", "P", "S", "F", "Cl", "Br", "I"]);

/**
 * Finite state automation class for parsing smiles into graphs
 */
export class SmilesParser {
    state : State = State.Base;
    graph : Graph;
    label = "";
    attachment_stack: Vertex[] = [];
    element_symbol = "";
    bond_order = 1;
    constructor(graph: Graph | null = null) {
        this.graph = graph ? graph : new Graph();
        this.reset();
    }

    parse(smiles: string) : void {
        for (let i = 0; i < smiles.length; i++) {
            this.nyamnyam(smiles[i], i);
        }
        // final call
        this.nyamnyam("", smiles.length);
    }

    open_bra() {
        if (! this.attachment_stack) {
            throw "( cannot be the first symbol of SMILES";
        }
        this.attachment_stack.push(this.attachment_stack[this.attachment_stack.length-1]);
    }

    close_bra() {
        if (! this.attachment_stack) {
            throw "Extraneous ) in SMILES";
        }
        this.attachment_stack.pop();
    }

    /**
     * Consume character
     */
    nyamnyam(char: string, position: number): void {
        if (this.state == State.BaseElementPending) {
            // we are in Base, not in square brackets. The only two char elements allowed here are Cl and Br
            if ( (this.element_symbol == "C" && char == "l") || (this.element_symbol == "B" && char == "r") ) {
                this.element_symbol = this.element_symbol + char;
                this.attach();
                this.state = State.Base;
                return;
            }
            this.state = State.Base; // fall through
        }
        if (this.state == State.BaseLabelPending) {
            if (char.match(/[0-9]/)) {
                this.state = State.BaseLabelPending;
                this.label += char;
                return;
            }
            console.log(`Found label ${this.label}`);
            this.state = State.Base;
        }
        if (this.state == State.Base) {
            if (this.element_symbol) {
                this.attach();
            }
            if (char == "") {
                return;
            }
            if (lowercase_aromatic_symbols.has(char)) {
                this.element_symbol = char.toUpperCase();
                return;
            }
            if ( organic_symbols.has(char) ) {
                this.element_symbol = char;
                this.state = State.BaseElementPending;
                return;
            }
            if (char == "(")
                return this.open_bra();
            if (char == ")")
                return this.close_bra();
            if (char == "[") {
                this.state = State.EnterAtom;
                return;
            }
            if ( char == "=" ) {
                this.bond_order = 2;
                return;
            }
            if (char == "#" ) {
                this.bond_order = 3;
                return;
            }
            if (char.match(/[0-9]/)) {
                this.state = State.BaseLabelPending;
                this.label = char;
                return;
            }
            throw `Unexpected ${char} at position ${position}`;
        }
        if (this.state == State.EnterAtom) {
            if (lowercase_aromatic_symbols.has(char) ){
                this.element_symbol = char.toUpperCase();
                this.state = State.InsideAtom;
                return;
            }
            // in fact, atom can start from any letter except X
            if ( char.match(/[A-Y|Z]/) ) {
                this.element_symbol = char;
                this.state = State.InsideAtomSymbolPending;
                return;
            }
            throw `Unexpected ${char} inside atom specification at position ${position}`;
        }
        if (this.state == State.InsideAtomSymbolPending) {
            if ( (this.element_symbol + char) in ChemicalElements) {
                this.element_symbol = this.element_symbol + char;
                this.attach();
                this.state = State.InsideAtom;
                this.element_symbol = "";
                return;
            }
            // fall through
            else {
                this.state = State.InsideAtom;
            }
        }
        if (this.state == State.InsideAtom) {
            if (this.element_symbol) {
                this.attach();
                this.element_symbol = "";
            }
            if (char == "]") {
                this.state = State.Base;
                return;
            }
            if (char == "+") {
                this.attachment_stack[this.attachment_stack.length-1].charge += 1;
                return;
            }
            if (char == "-") {
                this.attachment_stack[this.attachment_stack.length-1].charge -= 1;
                return;
            }
            throw `Unexpected ${char} inside atom specification at position ${position}`;
        }
    }

    attach() {
        let added;
        const attach_to = this.attachment_stack.pop();
        if (attach_to) {
            added = this.graph.add_chain(attach_to, 1);
        }
        else {
            added = this.graph.add_vertex( { x: 100, y: 100}, this.element_symbol);
        }
        this.attachment_stack.push(added.vertices[0]);
        added.vertices[0].label = this.element_symbol;
        if (this.bond_order == 2)
            added.edges[0].bond_type = BondType.Double;
        if (this.bond_order == 3)
            added.edges[0].bond_type = BondType.Triple;
        this.element_symbol = "";
        this.bond_order = 1;
    }

    reset() {
        this.state = State.Base;
        this.element_symbol = "";
        this.attachment_stack = [];
        this.bond_order = 1;
        this.label = "";
    }
}