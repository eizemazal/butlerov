import {MoleculeEditor} from "../controller/MoleculeEditor";
import { fireEvent } from "@testing-library/dom";
//import { userEvent } from "@testing-library/user-event";
import { Vector2d } from "konva/lib/types";
import Konva from "konva";
//import { createEvent } from "konva/lib/PointerEvents";

const wrapper = document.createElement("div");
const body = document.getElementsByTagName("body")[0];
body.appendChild(wrapper);
const stage = new Konva.Stage({
    container: wrapper,
    width: 300,
    height: 300,
});

const editor = new MoleculeEditor(stage);

type EventMockObject = {
    button?: number,
    target?: HTMLDivElement | null,
    screenX?: number,
    screenY?: number,
    shiftKey?: boolean,
    ctrlKey?: boolean,
    metaKey?: boolean,
}

type KeyMockObject = {
    key?: string,
    ctrlKey?: boolean,
    shiftKey?: boolean,
    metaKey?: boolean
}

function fire(pos: Vector2d, event_type: string, evt: EventMockObject | null = null) {
    if (event_type == "click" && !evt) {
        evt = { button: 1 };
    }
    const konva_evt = {
        ...evt,
        clientX: pos.x,
        clientY: pos.y,
        button: evt?.button || 0,
        pointerId: ["pointerdown", "pointerup", "pointermove"].includes(event_type) ? 1 : undefined,
        type: event_type,
    // this is from Konva tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    switch (event_type) {
    case "click":
        fire(pos, "mousedown", evt);
        fire(pos, "mouseup", evt);
        break;
    case "pointerdown":
        stage._pointerdown(konva_evt);
        break;
    case "mousedown":
        fire(pos, "pointerdown", evt);
        stage._pointerdown(konva_evt);
        break;
    case "pointerup":
        stage._pointerup(konva_evt);
        break;
    case "mouseup":
        fire(pos, "pointerup", evt);
        Konva.DD._endDragBefore(konva_evt);
        stage._pointerup(konva_evt);
        Konva.DD._endDragAfter(konva_evt);
        break;
    case "pointermove":
        stage._pointermove(konva_evt);
        break;
    case "mousemove":
        fire(pos, "pointermove", evt);
        Konva.DD._drag(konva_evt);
        stage._pointermove(konva_evt);
        break;
    default:
        throw "Event type " + event_type + " not implemented.";
    }
}


function fire_key(key: string, key_obj: KeyMockObject = {}) {
    key_obj.key = key;

    const target = document.activeElement || document.body;

    fireEvent.keyDown(target, key_obj);
    fireEvent.keyPress(target, key_obj);
    fireEvent.keyUp(target, key_obj);
    //fireEvent.input(target, new Event("input"));

}

export { fire_key, fire, editor };