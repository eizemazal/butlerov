import Konva from "konva";
import { Controller } from "../controller/Controller";
import { Drawable } from "./Drawable";
import { Coords } from "../lib/common";
import { CompositeLinearFormulaFragment } from "../lib/linear";

export class FontStyle {
    size = 12;
    family = "Arial";
    color = "#bbb";
    weight: "" | "bold" | number = "";

    public get style() {
        return `${this.weight}`;
    }
}


/**
 * Text segment is a convenience class to render things like <sup>13</sup>CH<sub>2</sub><sup>2+</sup>
 * These are often encountered in chemical formula. Also, it is possible to use TextSegments to render rich texts.
 * Each TextSegment may contain text (written on common baseline),
 * index_rb (right bottom), like in O2
 * index_rt (right top), like in Ca2+
 * index_lt (left top), like in 31P
 * font_family and font_size_px properties can be specified
 * color is get/set property
 *
 * TextSegment's group zero point is at left top corner of baseline text.
 * center_x and center_y props refer to the central point of baseline text.
 */
export class TextSegment extends Drawable {
    // baseline text
    text = "";
    // index at right bottom, i.e. count
    index_rb = "";
    // index at top right, i.e. charge
    index_rt = "";
    // index at left top, i.e. isotope
    index_lt = "";

    // this is not used in implementation, just an attribute that we should not break at this segment
    nobreak = false;

    _style: FontStyle;

    // these readonly properties are computed at update() costlessly
    _first_letter_center_x = 0;
    _last_letter_center_x = 0;
    _top_boundary = 0;
    _bottom_boundary = 0;
    _right_boundary = 0;

    constructor(text: string, index_rb="", index_rt="", index_lt = "") {
        super();
        this.text = text;
        this.index_rb = index_rb;
        this.index_rt = index_rt;
        this.index_lt = index_lt;
        this._style = new FontStyle();
    }

    public get color(): string {
        return this._style.color;
    }

    public set color(value: string) {
        if (value == this._style.color)
            return;
        this._style.color = value;
        for (const selector of ["lt", "rt", "rb", "txt"])
            this.group?.findOne(`#${selector}`)?.setAttr("fill", value);
    }


    public get font_style(): FontStyle {
        return this._style;
    }

    /**
     * set font style. If only change in color is needed, use color setter that is faster to update
     */
    public set font_style(style: FontStyle) {
        this._style = style;
        this.update();
    }

    public get x(): number {
        return this.group?.getAttr("x") || 0;
    }

    public set x(value: number) {
        this.group?.setAttr("x", value);
    }

    public get y(): number {
        return this.group?.getAttr("y") || 0;
    }

    public set y(value: number) {
        this.group?.setAttr("y", value);
    }

    public get left_boundary(): number {
        return 0;
    }
    public get right_boundary(): number {
        return this._right_boundary;
    }

    public get top_boundary(): number {
        return this._top_boundary;
    }

    public get bottom_boundary(): number {
        return this._bottom_boundary;
    }

    public get first_letter_center_x() {
        return this._first_letter_center_x;
    }

    public get center_x() {
        return (this.right_boundary - this.left_boundary) / 2 + this.left_boundary;
    }

    public get center_y() {
        return this._style.size / 2;
    }

    public get last_letter_center_x() {
        return this._last_letter_center_x;
    }

    /**
     * Update this instance of segment with another segment given.
     * @param ts another text segment
     * @returns whether redraw was required
     */
    update_with(ts: TextSegment): boolean {

        this.nobreak = ts.nobreak;

        let redraw_required = false;

        if (ts.text != this.text) {
            this.text = ts.text;
            redraw_required = true;
        }
        if (ts.index_rb != this.index_rb) {
            this.index_rb = ts.index_rb;
            redraw_required = true;
        }
        if (ts.index_rt != this.index_rt) {
            this.index_rt = ts.index_rt;
            redraw_required = true;
        }
        if (ts.index_lt != this.index_lt) {
            this.index_lt = ts.index_lt;
            redraw_required = true;
        }
        if (redraw_required)
            this.update();
        return redraw_required;
    }

    update() : void {
        if (!this.group || !this.controller)
            return;

        let x = 0;

        this._top_boundary = 0;
        this._bottom_boundary = 0;
        this._right_boundary = 0;

        const index_font_size = this._style.size * this.controller?.stylesheet.index_font_size_ratio;
        const superscript_offset_y = this.controller.stylesheet.superscript_offset_ratio * this._style.size;
        const subscript_offset_y = this.controller.stylesheet.subscript_offset_ratio * this._style.size;

        // left top index
        let elem : Konva.Text = this.group.findOne("#lt");
        if (this.index_lt) {
            if (!elem)
                elem = new Konva.Text({id : "lt"});
            elem.setAttr("text", this.index_lt);
            elem.setAttr("fill", this._style.color);
            elem.setAttr("fontFamily", this._style.family);
            elem.setAttr("fontSize", index_font_size);
            elem.setAttr("fontStyle", `${this.controller?.stylesheet.index_font_weight}`);
            elem.setAttr("x", 0);
            elem.setAttr("y",  this._style.size / 2 - index_font_size - superscript_offset_y);
            this._top_boundary = this._style.size / 2 - index_font_size - superscript_offset_y;
            this._bottom_boundary = this._style.size / 2 - superscript_offset_y;
            x += elem.getWidth();
            this._right_boundary = x;
            this.group.add(elem);
        }
        else if (elem)
            elem.destroy();

        let first_letter_width = 0;
        let last_letter_width = 0;
        elem = this.group?.findOne("#txt");
        if (this.text) {
            if (!elem)
                elem = new Konva.Text({id : "txt"});
            elem.setAttr("fill", this._style.color);
            elem.setAttr("fontFamily", this._style.family);
            elem.setAttr("fontSize", this._style.size);
            elem.setAttr("x", x);
            elem.setAttr("y", 0);
            elem.setAttr("text", this.text[0]);
            first_letter_width = elem.getWidth();
            if (this.text.length > 1) {
                elem.setAttr("text", this.text[this.text.length-1]);
                last_letter_width = elem.getWidth();
                elem.setAttr("text", this.text);
            }
            else
                last_letter_width = first_letter_width;

            this._bottom_boundary =this._style.size;
            this._first_letter_center_x = x + first_letter_width / 2;
            x += elem.getWidth();
            this._last_letter_center_x = x - last_letter_width / 2;
            this._right_boundary = x;
            this.group.add(elem);
        }
        else if (elem)
            elem.destroy();


        // right top index
        elem = this.group.findOne("#rt");
        if (this.index_rt) {
            if (!elem)
                elem = new Konva.Text({id : "rt"});
            elem.setAttr("text", this.index_rt);
            elem.setAttr("fill", this._style.color);
            elem.setAttr("fontFamily", this._style.family);
            elem.setAttr("fontSize", index_font_size);
            elem.setAttr("fontStyle", `${this.controller?.stylesheet.index_font_weight}`);
            elem.setAttr("x", x);
            elem.setAttr("y",  this._style.size / 2 - index_font_size - superscript_offset_y);
            this._top_boundary = Math.min(this._top_boundary, this._style.size / 2 - index_font_size - superscript_offset_y);
            this._bottom_boundary =Math.max(this._bottom_boundary, this._style.size / 2 - superscript_offset_y);
            this._right_boundary = x + elem.getWidth();
            this.group.add(elem);
        }
        else if (elem)
            elem.destroy();

        // right bottom index
        elem = this.group.findOne("#rb");
        if (this.index_rb) {
            if (!elem)
                elem = new Konva.Text({id : "rb"});
            elem.setAttr("text", this.index_rb);
            elem.setAttr("fill", this._style.color);
            elem.setAttr("fontFamily", this._style.family);
            elem.setAttr("fontSize", index_font_size);
            elem.setAttr("fontStyle", `${this.controller?.stylesheet.index_font_weight}`);
            elem.setAttr("x", x);
            elem.setAttr("y",  this._style.size / 2 + subscript_offset_y);
            this._top_boundary = Math.min(this._top_boundary, this._style.size / 2 + subscript_offset_y);
            this._bottom_boundary = Math.max(this._bottom_boundary, this._style.size / 2 + subscript_offset_y + index_font_size);
            this._right_boundary = Math.max(this._right_boundary, x + elem.getWidth());
            this.group.add(elem);
        }
        else if (elem)
            elem.destroy();
    }

}


export enum TextDirection {
    LEFT_TO_RIGHT,
    RIGHT_TO_LEFT,
    TOP_TO_BOTTOM,
    BOTTOM_TO_TOP
}

export enum TextAlignment {
    FIRST_SEGMENT_FIRST_LETTER,
    FIRST_SEGMENT_CENTER
}


export class SegmentedText extends Drawable {

    segments: TextSegment[] = [];
    _direction: TextDirection = TextDirection.LEFT_TO_RIGHT;
    _alignment: TextAlignment = TextAlignment.FIRST_SEGMENT_FIRST_LETTER;

    constructor(segments: TextSegment[] = []) {
        super();
        this.segments = segments;
    }

    attach(controller: Controller): Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        for (const [idx, segment] of this.segments.entries()) {
            const segment_group = segment.attach(controller);
            segment_group.setAttr("id", `s${idx}`);
            this.group.add();
        }
        return this.group;
    }

    detach() {
        this.segments.forEach( e => e.detach() );
        this.group?.destroyChildren();
        this.controller = null;
    }

    update_with_segments(new_segments: TextSegment[]) {
        let j = 0;
        for (let i = 0; i < this.segments.length; i++) {
            if (j == new_segments.length) {
                this.segments[i].detach();
                continue;
            }
            this.segments[i].update_with(new_segments[j]);
            j++;
        }
        for (let i = j; i < new_segments.length; i++) {
            this.segments.push(new_segments[i]);
            if (this.controller)
                new_segments[i].attach(this.controller);
        }
        this.segments = this.segments.slice(0, new_segments.length);
    }


    format_linear_formula(linear: CompositeLinearFormulaFragment): void {
        this.update_with_segments(linear.to_text_segments());
    }

    format_text(text: string) : void {
        // this does not process charges by design
        const new_segments : TextSegment[] = [];
        let next_segment = new TextSegment("");
        let was_digit = false;
        for (let i = 0; i < text.length; i++) {
            // is 0 to 9
            if (text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
                // ignore digits at the beginning
                if (next_segment.text == "") { continue; }
                next_segment.index_rb += text[i];
                was_digit = true;
            }
            else {
                if (was_digit) {
                    new_segments.push(next_segment);
                    next_segment = new TextSegment(text[i]);
                }
                else {
                    next_segment.text += text[i];
                }
                was_digit = false;
            }
        }
        new_segments.push(next_segment);
        this.update_with_segments(new_segments);
    }

    public get direction(): TextDirection {
        return this._direction;
    }

    public set direction(value: TextDirection) {
        if (this._direction == value)
            return;
        this._direction = value;
        this.update();
    }

    public get alignment(): TextAlignment {
        return this._alignment;
    }

    public set alignment(alignment: TextAlignment) {
        if (this._alignment == alignment)
            return;
        this._alignment = alignment;
        this.update();
    }

    public get empty() {
        return this.segments.length == 0;
    }

    public clear() {
        for (const segment of this.segments) {
            segment.detach();
        }
        this.segments = [];
    }

    public set color(value: string) {
        for (const segment of this.segments) {
            segment.color = value;
        }
        // no need to call update
    }

    update() {
        if (this.segments.length == 1) {
            const current = this.segments[0];
            current.x = -current.first_letter_center_x;
            current.y = -current.center_y;
        }
        else if (this.segments.length > 1) {
            const current = this.segments[0];
            if ( (this._direction == TextDirection.LEFT_TO_RIGHT || this._direction == TextDirection.RIGHT_TO_LEFT)
                    && this._alignment == TextAlignment.FIRST_SEGMENT_FIRST_LETTER)
                current.x = -current.first_letter_center_x;
            else
                current.x = -current.center_x;
            current.y = -current.center_y;
        }

        for (let idx = 1; idx < this.segments.length; idx++) {
            const prev = this.segments[idx-1];
            const current = this.segments[idx];
            let direction = this._direction;
            if (current.nobreak) {
                direction = TextDirection.LEFT_TO_RIGHT;
            }
            switch (direction) {
            case TextDirection.LEFT_TO_RIGHT:
                current.x = prev.x + prev.right_boundary;
                current.y = prev.y;
                break;
            case TextDirection.RIGHT_TO_LEFT:
                current.x = prev.x - current.right_boundary;
                current.y = prev.y;
                break;
            case TextDirection.BOTTOM_TO_TOP:
                current.x = prev.x + (prev.first_letter_center_x - current.first_letter_center_x);
                current.y = prev.y - current.bottom_boundary;
                break;
            case TextDirection.TOP_TO_BOTTOM:
                current.x = prev.x + (prev.first_letter_center_x - current.first_letter_center_x);
                current.y = prev.y + prev.bottom_boundary;
            }
        }

        for (const [idx, segment] of this.segments.entries()) {
            segment.update();
            if (segment.group) {
                segment.group.setAttr("id", `s${idx}`);
                this.group?.add(segment.group);
            }
        }

        let idx = this.segments.length;
        for(;;) {
            const nextone = this.group?.findOne(`#s${idx}`);
            if (!nextone)
                break;
            nextone.destroy();
            idx += 1;
        }
    }

    public get_boundary_offset_at(alfa: number) : Coords {
        if (this.empty)
            return {x : 0, y: 0};

        const rb = this.segments[0].right_boundary + this.segments[0].x;
        const lb = this.segments[0].left_boundary + this.segments[0].x;
        const tb = this.segments[0].top_boundary + this.segments[0].y;
        const bb = this.segments[0].bottom_boundary + this.segments[0].y;

        // Calculate direction vector from the angle
        const dx = Math.cos(alfa);
        const dy = Math.sin(alfa);


        // check intersection with right and left side
        if (dx != 0) {
            const y = dy * ( (dx > 0 ? rb : lb) / dx);
            if (y >= tb && y <= bb ) {
                return {x: (dx > 0 ? rb : lb), y: y};
            }
        }

        // check intersection with top and bottom side
        if (dy != 0) {
            const x = dx * ( (dy > 0 ? bb : tb) / dy);
            if (x >= lb && x <= rb )
                return {x: x, y: (dy > 0 ? bb : tb)};
        }

        return {x: 0, y: 0};
    }
}

