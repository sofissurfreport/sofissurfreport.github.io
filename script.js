/* Sofi's Surf Report
 * This starter version stores the beach list in this browser only.
 * Connect a Cloudflare Worker/KV endpoint to share settings with the LED board.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "sofis-surf-report-beaches-v1";
  const ENDPOINT_KEY = "sofis-surf-report-api-endpoint-v1";

  const form = document.getElementById("beachForm");
  const nameInput = document.getElementById("beachName");
  const urlInput = document.getElementById("surflineUrl");
  const formMessage = document.getElementById("formMessage");
  const beachList = document.getElementById("beachList");
  const beachCount = document.getElementById("beachCount");
  const emptyState = document.getElementById("emptyState");
  const exportButton = document.getElementById("exportButton");
  const toast = document.getElementById("toast");
  const settingsButton = document.getElementById("settingsButton");
  const settingsDialog = document.getElementById("settingsDialog");
  const apiEndpoint = document.getElementById("apiEndpoint");
  const saveSettingsButton = document.getElementById("saveSettingsButton");
  const clearBeachesButton = document.getElementById("clearBeachesButton");
  const settingsMessage = document.getElementById("settingsMessage");

  let beaches = loadBeaches();

  function loadBeaches() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed)
        ? parsed.filter(item => item && typeof item.name === "string" && typeof item.url === "string")
        : [];
    } catch {
      return [];
    }
  }

  function saveBeaches() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(beaches));
      return true;
    } catch {
      showToast("Could not save in this browser. Check storage settings.");
      return false;
    }
  }

  function isSurflineUrl(value) {
    try {
      const url = new URL(value);
      return (url.protocol === "https:" || url.protocol === "http:") &&
        (url.hostname === "surfline.com" || url.hostname.endsWith(".surfline.com"));
    } catch {
      return false;
    }
  }

  function escapeText(value) {
    // Values are rendered using textContent below; this helper is for URL labels only.
    return String(value);
  }

  function waveSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 48");
    svg.setAttribute("class", "row-wave");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M4 37 C20 37 29 29 38 16 C45 5 54 1 62 5 C68 8 68 14 65 18 C62 21 58 20 56 16 C60 26 70 31 82 29 C88 28 92 25 96 22");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "5");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
    return svg;
  }

  function trashSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const paths = [
      "M4 7h16",
      "M9 7V4h6v3",
      "M7 7l1 13h8l1-13",
      "M10 10v7",
      "M14 10v7"
    ];
    paths.forEach(d => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    return svg;
  }

  function render() {
    beachList.replaceChildren();
    emptyState.hidden = beaches.length > 0;
    beachCount.textContent = `${beaches.length} ${beaches.length === 1 ? "beach" : "beaches"}`;

    beaches.forEach((beach, index) => {
      const row = document.createElement("article");
      row.className = "beach-row";
      row.appendChild(waveSvg());

      const info = document.createElement("div");
      info.className = "beach-info";

      const title = document.createElement("h3");
      title.className = "beach-name";
      title.textContent = beach.name;

      const link = document.createElement("a");
      link.className = "beach-url";
      link.href = beach.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = beach.url;
      link.textContent = escapeText(beach.url);

      info.append(title, link);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-button";
      remove.appendChild(trashSvg());
      const removeLabel = document.createElement("span");
      removeLabel.textContent = "Remove";
      remove.appendChild(removeLabel);
      remove.setAttribute("aria-label", `Remove ${beach.name}`);
      remove.addEventListener("click", () => {
        const removed = beaches[index];
        beaches.splice(index, 1);
        saveBeaches();
        render();
        showToast(`${removed.name} removed from this browser's list.`);
      });

      row.append(info, remove);
      beachList.appendChild(row);
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function clearValidation() {
    formMessage.textContent = "";
    nameInput.removeAttribute("aria-invalid");
    urlInput.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    clearValidation();

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name) {
      nameInput.setAttribute("aria-invalid", "true");
      formMessage.textContent = "Please enter a beach name.";
      nameInput.focus();
      return;
    }
    if (!isSurflineUrl(url)) {
      urlInput.setAttribute("aria-invalid", "true");
      formMessage.textContent = "Please enter a valid Surfline link (surfline.com).";
      urlInput.focus();
      return;
    }
    if (beaches.some(beach => beach.url.toLowerCase() === url.toLowerCase())) {
      urlInput.setAttribute("aria-invalid", "true");
      formMessage.textContent = "That Surfline link is already on your board list.";
      urlInput.focus();
      return;
    }

    beaches.push({ name, url });
    saveBeaches();
    render();
    form.reset();
    nameInput.focus();
    showToast(`${name} added to the list on this device.`);
  });

  nameInput.addEventListener("input", () => nameInput.removeAttribute("aria-invalid"));
  urlInput.addEventListener("input", () => urlInput.removeAttribute("aria-invalid"));

  exportButton.addEventListener("click", () => {
    const data = JSON.stringify({ beaches }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = "sofis-surf-report-beaches.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
    showToast("Beach list exported as JSON.");
  });

  settingsButton.addEventListener("click", () => {
    apiEndpoint.value = localStorage.getItem(ENDPOINT_KEY) || "";
    settingsMessage.textContent = "";
    if (typeof settingsDialog.showModal === "function") settingsDialog.showModal();
    else showToast("Settings dialog is not supported by this browser.");
  });

  saveSettingsButton.addEventListener("click", () => {
    const value = apiEndpoint.value.trim();
    if (value) {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
        localStorage.setItem(ENDPOINT_KEY, value);
      } catch {
        settingsMessage.textContent = "Enter a valid http:// or https:// endpoint URL.";
        return;
      }
    } else {
      localStorage.removeItem(ENDPOINT_KEY);
    }
    settingsDialog.close();
    showToast("Setting saved locally. API syncing is not connected yet.");
  });

  clearBeachesButton.addEventListener("click", () => {
    if (!window.confirm("Remove every beach from this browser's list?")) return;
    beaches = [];
    saveBeaches();
    render();
    settingsMessage.textContent = "Beach list cleared.";
    showToast("Beach list cleared.");
  });

  render();
})();
