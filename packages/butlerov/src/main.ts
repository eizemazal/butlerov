import { MoleculeEditor as me } from "./controller/MoleculeEditor";
export const MoleculeEditor = me;

import {MolConverter as mc} from "./converter/MolConverter";
export const MolConverter = mc;

import {SmilesConverter as smi_cnv } from "./converter/SmilesConverter";
export const SmilesConverter = smi_cnv;

import { MW as descr_mw, Composition as descr_comp} from "./descriptor/mw";
export const MW = descr_mw;
export const Composition = descr_comp;
