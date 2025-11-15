frappe.provide("frappe.iframe");

const MODAL_STYLE = `
  width: 100%;
  max-width: 100%;
  height: 70vh;
  max-height: 70vh;
  overflow: hidden;
  margin: 0;
  box-sizing: border-box;
`;

const IFRAME_STYLE = `
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  box-sizing: border-box;
`;

const INJECTED_CSS = `
  body { padding-top: 0 !important; }
  header.navbar.navbar-expand { display: none !important; }
  .page-head { position: static !important; }
  .page-content { padding-top: 15px !important; }
  a.growatt-allow-click { pointer-events: auto !important; }
  a { cursor: pointer; }
  .form-tabs-list,
  .nav.form-tabs,
  ul#form-tabs.nav.form-tabs {
    position: sticky !important;
    top: 0 !important;
  }
`;

function setFooterButtonsPrimary($wrapper: JQuery<HTMLElement>) {
  const $footerBtns = $wrapper.find('.modal-footer .btn');
  $footerBtns.removeClass('btn-secondary').addClass('btn-primary');
  $footerBtns.slice(0, -1).css('margin-right', '8px');
}

function injectIframeCSS(doc: Document) {
  const style = doc.createElement("style");
  style.innerHTML = INJECTED_CSS;
  doc.head?.appendChild(style);
  const header = doc.querySelector('header.navbar.navbar-expand');
  if (header) header.remove();
}

function blockNavigationFactory(lockedName?: string) {
  return (ev: any) => {
    let a = ev.target.closest ? ev.target.closest("a") : null;
    if (a) {
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) return;
      if (lockedName && href && href.includes(encodeURIComponent(lockedName))) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      a.removeAttribute("href");
      frappe.show_alert({
        message: __("Navegação bloqueada: só é permitido visualizar este documento."),
        indicator: "orange",
      });
    }
  };
}

function blockFormSubmit(ev: any) {
  ev.preventDefault();
  ev.stopImmediatePropagation();
  frappe.show_alert({
    message: __("Envio de formulários bloqueado dentro do iframe."),
    indicator: "orange",
  });
}

const iframe_view = {
  _create_fullscreen_modal() {
      if ((window as any).__growatt_iframe_modal) {
        return (window as any).__growatt_iframe_modal;
      }

      const dialog = new frappe.ui.Dialog({
        title: __("Documento"),
        size: "extra-large",
        fields: [],
        primary_action_label: __("Atualizar"),
        primary_action: () => {
          try {
            if (modalAPI.iframe) {
              modalAPI.iframe.contentWindow?.location.reload();
            }
          } catch (e) {
            if (modalAPI.iframe) {
              modalAPI.iframe.src = modalAPI.iframe.src;
            }
          }
        },
      });

      const iframeWrapper = $(`<div style="${MODAL_STYLE}"></div>`);
      let iframe: JQuery<HTMLElement> | null = null;

      function createIframe() {
        iframe = $(`<iframe style="${IFRAME_STYLE}" sandbox="allow-scripts allow-same-origin"></iframe>`);
        iframeWrapper.empty().append(iframe);
        dialog['body'].appendChild(iframeWrapper[0]);

        iframe.on("load", () => {
          const lockedName = (dialog as any).__doc_locked_name;
          try {
            const doc = (iframe![0] as HTMLIFrameElement).contentDocument || (iframe![0] as HTMLIFrameElement).contentWindow?.document;
            if (!doc) throw new Error("Sem acesso ao iframe");
            injectIframeCSS(doc);
            doc.addEventListener("click", blockNavigationFactory(lockedName), true);
            doc.addEventListener("auxclick", blockNavigationFactory(lockedName), true);
            doc.addEventListener("submit", blockFormSubmit, true);
          } catch (e) {
            console.warn("Falha ao injetar bloqueio e estilos no iframe:", e);
          }
          iframe!.css('visibility', 'visible');
        });
        iframe!.css('visibility', 'hidden');
      }

      createIframe();

      dialog['add_custom_action'](__("Abrir em nova aba"), () => {
        const url = iframe?.attr("src");
        window.open(url!, "_blank");
      });

      dialog['add_custom_action'](__("Copiar link"), async () => {
        try {
          await navigator.clipboard.writeText(iframe?.attr("src")!);
          frappe.show_alert({ message: __("Link copiado"), indicator: "green" });
        } catch (e) {
          frappe.msgprint(__("Não foi possível copiar o link"));
        }
      });

      setTimeout(() => setFooterButtonsPrimary($(dialog['$wrapper'])), 0);

      const modalAPI = {
        dialog: dialog,
        get iframe() {
          return iframe ? (iframe[0] as HTMLIFrameElement) : null;
        },
        show(url: string, displayTitle?: string, originalDocName?: string) {
          // Remove iframe anterior e cria novo
          createIframe();
          iframe!.attr("src", url);
          dialog.set_title(displayTitle || __("Documento"));
          (dialog as any).__doc_locked_name = originalDocName;
          dialog.show();
        },
        hide() {
          // Remove iframe do DOM para descarregar página
          iframeWrapper.empty();
          iframe = null;
          dialog.hide();
        },
      };

      (window as any).__growatt_iframe_modal = modalAPI;
      return modalAPI;
    },

  _open_doc_modal(doctype: string, docname: string) {
    const slug = String(doctype).toLowerCase().replace(/\s+/g, "-");
    const url = `/app/${slug}/${encodeURIComponent(docname)}?embedded=1&from_iframe=1`;
    const displayTitle = `${doctype}: ${docname}`;
    const modal = iframe_view._create_fullscreen_modal();
    modal.show(url, displayTitle, docname);
  },
};

// @ts-ignore - frappe.provide cria o namespace iframe
frappe.iframe.view = iframe_view;
