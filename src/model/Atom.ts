class Atom {
    x: number;
    y: number;
    label: string;
    charge: number;

    constructor(x: number, y: number, label="") {
        this.x = x;
        this.y = y;
        this.label = label;
        this.charge = 0;
    }
}

export {Atom};