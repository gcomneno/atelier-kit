import { invoke } from "@tauri-apps/api/core";

interface DesktopStatus {
  site_path: string | null;
  site_valid: boolean;
  server_running: boolean;
  studio_url: string;
  preview_url: string;
}

const sitePathEl = document.querySelector("#site-path") as HTMLElement;
const serverStatusEl = document.querySelector("#server-status") as HTMLElement;
const messageEl = document.querySelector("#message") as HTMLElement;
const pickFolderBtn = document.querySelector("#pick-folder") as HTMLButtonElement;
const startStudioBtn = document.querySelector("#start-studio") as HTMLButtonElement;
const openPreviewBtn = document.querySelector("#open-preview") as HTMLButtonElement;
const stopServerBtn = document.querySelector("#stop-server") as HTMLButtonElement;

function showMessage(text: string, isError = false) {
  messageEl.textContent = text;
  messageEl.hidden = false;
  messageEl.classList.toggle("error", isError);
}

function clearMessage() {
  messageEl.hidden = true;
  messageEl.textContent = "";
  messageEl.classList.remove("error");
}

function applyStatus(status: DesktopStatus) {
  sitePathEl.textContent = status.site_path ?? "—";
  serverStatusEl.textContent = status.server_running ? "running" : "stopped";
  serverStatusEl.classList.toggle("running", status.server_running);

  const canStart = Boolean(status.site_valid);
  startStudioBtn.disabled = !canStart;
  openPreviewBtn.disabled = !canStart;
  stopServerBtn.disabled = !status.server_running;
}

async function refreshStatus() {
  const status = await invoke<DesktopStatus>("get_status");
  applyStatus(status);
}

async function withBusy(button: HTMLButtonElement, action: () => Promise<void>) {
  const label = button.textContent ?? "";
  button.disabled = true;
  button.dataset.busy = "true";

  try {
    await action();
  } finally {
    button.disabled = false;
    button.dataset.busy = "";
    button.textContent = label;
    await refreshStatus();
  }
}

pickFolderBtn.addEventListener("click", () => {
  withBusy(pickFolderBtn, async () => {
    clearMessage();

    try {
      const status = await invoke<DesktopStatus>("pick_site_folder");
      applyStatus(status);

      if (status.site_valid) {
        showMessage("Site folder saved. You can open the studio.");
      }
    } catch (error) {
      showMessage(String(error), true);
    }
  });
});

startStudioBtn.addEventListener("click", () => {
  withBusy(startStudioBtn, async () => {
    clearMessage();
    startStudioBtn.textContent = "Starting…";

    try {
      await invoke<DesktopStatus>("start_studio");
      showMessage("Studio opened. Edit your site in the new window.");
    } catch (error) {
      showMessage(String(error), true);
    }
  });
});

openPreviewBtn.addEventListener("click", () => {
  withBusy(openPreviewBtn, async () => {
    clearMessage();

    try {
      await invoke("open_preview");
      showMessage("Preview opened in your browser.");
    } catch (error) {
      showMessage(String(error), true);
    }
  });
});

stopServerBtn.addEventListener("click", () => {
  withBusy(stopServerBtn, async () => {
    clearMessage();

    try {
      await invoke<DesktopStatus>("stop_studio");
      showMessage("Dev server stopped.");
    } catch (error) {
      showMessage(String(error), true);
    }
  });
});

window.addEventListener("DOMContentLoaded", () => {
  refreshStatus().catch((error) => {
    showMessage(String(error), true);
  });
});
