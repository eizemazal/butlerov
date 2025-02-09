/**
 * Should match main/preload.ts for typescript support in renderer
 */

import { APIInterface } from "../../main/preload"


declare global {
  interface Window {
    electronAPI: APIInterface,
  }
}
