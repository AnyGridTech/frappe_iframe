interface IframeModalAPI {
  dialog: any;
  iframe: HTMLIFrameElement | null;
  show(url: string, displayTitle?: string, originalDocName?: string): void;
  hide(): void;
}

interface IframeView {
  _create_fullscreen_modal(): IframeModalAPI;
  _open_doc_modal(doctype: string, docname: string): void;
}

declare global {
  interface Frappe {
    iframe: {
      view: IframeView;
    };
  }
}

export {};
