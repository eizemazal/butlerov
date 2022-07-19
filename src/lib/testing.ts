import { MoleculeEditor } from "../controller/MoleculeEditor";
import { fireEvent } from "@testing-library/dom";
import { Vector2d } from "konva/lib/types";

const wrapper = document.createElement("div");
const editor = MoleculeEditor.from_html_element(wrapper);
editor.stage.setAttr("width", 300);
editor.stage.setAttr("height", 300);

type EventMockObject = {
    evt?: {
        button?: number,
        target?: HTMLDivElement | null,
        screenX?: number,
        screenY?: number,
        shiftKey?: boolean,
        ctrlKey?: boolean,
        metaKey?: boolean,
    }
}

type KeyMockObject = {
    key?: string,
    ctrlKey?: boolean,
    shiftKey?: boolean,
    metaKey?: boolean
}

function fire(pos: Vector2d, event_type: string, evt: EventMockObject | null = null) {
    if (event_type == "click" && !evt) {
        evt = {evt: {button: 1}};
    }
    if (["mouseover", "mouseout"].indexOf(event_type) != -1 && !evt) {
        evt = {evt: {target: null, screenX: pos.x, screenY: pos.y }};
    }
    editor.stage.setPointersPositions({clientX: pos.x, clientY: pos.y});
    // for some reason, editor.stage.getIntersection(pos) does not work
    const shapes = editor.stage.getAllIntersections(pos);
    if (shapes.length) {
        shapes[shapes.length - 1].fire(event_type, evt, true);
    }
    else
        editor.background_layer.fire(event_type, evt);
}

function fire_key(key: string, key_obj: KeyMockObject = {}) {
    key_obj.key = key;
    fireEvent.keyDown(wrapper, key_obj);
}

export { fire_key, fire, editor };