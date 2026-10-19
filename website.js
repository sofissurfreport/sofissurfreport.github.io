
/* Sofi's Surf Report
 * Loads and saves the shared beach list through Cloudflare.
 */
(() => {
  "use strict";

  const API_URL =
    "https://sofis-surf-report.sofissurfreport.workers.dev/";

  const form = document.getElementById("beachForm");
  const nameInput = document.getElementById("beachName");
  const urlInput = document.getElementById("surflineUrl");
  const formMessage = document.getElementById("formMessage");
  const beachList = document.getElementById("beachList");
  const beachCount = document.getElementById("beachCount");
  const emptyState = document.getElementById("emptyState");
  const toast = document.getElementById("toast");

  let beaches = [];
  let busy = false;

  async function requestBeaches(method = "GET", data = null) {
    const options = { method };

    if (method === "POST") {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify({ beaches: data });
    }

    const response = await fetch(API_URL, options);
    const result = await response.json();

    if (!response.ok || result.error || result.success === false) {
      throw new Error(result.error || "The server request failed.");
    }

    return result;
  }

  async function loadBeaches() {
    beachList.textContent = "Loading beaches...";
    emptyState.hidden = true;

    try {
      const data = await requestBeaches();
      beaches = Array.isArray(data.beaches) ? data.beaches : [];
      render();
    } catch (error) {
      beachList.textContent = "";
      emptyState.hidden = false;
      emptyState.querySelector("p").textContent =
        "Couldn't load beaches.";
      emptyState.querySelector("span:last-child").textContent =
        "Check your connection and try refreshing the page.";
      showToast("Could not load beaches: " + error.message);
    }
  }

  async function saveBeaches(updatedBeaches) {
    await requestBeaches("POST", updatedBeaches);
    beaches = updatedBeaches;
    render();
  }

  function isSurflineUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        (url.hostname === "surfline.com" ||
         url.hostname.endsWith(".surfline.com"));
    } catch {
      return false;
    }
  }

  function waveSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 48");
    svg.setAttribute("class", "row-wave");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS(ns, "path");
    path.setAttribute(
      "d",
      "M4 37 C20 37 29 29 38 16 C45 5 54 1 62 5 C68 8 68 14 65 18 C62 21 58 20 56 16 C60 26 70 31 82 29 C88 28 92 25 96 22"
    );
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

    [
      "M4 7h16",
      "M9 7V4h6v3",
      "M7 7l1 13h8l1-13",
      "M10 10v7",
      "M14 10v7"
    ].forEach(d => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });

    return svg;
  }

  function render() {
    beachList.replaceChildren();
    emptyState.hidden = beaches.length > 0;

    beachCount.textContent =
      `${beaches.length} ${beaches.length === 1 ? "beach" : "beaches"}`;

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
      link.textContent = beach.url;

      info.append(title, link);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-button";
      remove.appendChild(trashSvg());

      const label = document.createElement("span");
      label.textContent = "Remove";
      remove.appendChild(label);
      remove.setAttribute("aria-label", `Remove ${beach.name}`);
      remove.disabled = busy;

      remove.addEventListener("click", async () => {
        if (busy) return;

        const updated = beaches.filter((_, i) => i !== index);

        try {
          setBusy(true);
          await saveBeaches(updated);
          showToast(`${beach.name} removed from your board.`);
        } catch (error) {
          showToast("Couldn't remove beach: " + error.message);
        } finally {
          setBusy(false);
          render();
        }
      });

      row.append(info, remove);
      beachList.appendChild(row);
    });
  }

  function setBusy(value) {
    busy = value;
    form.querySelector('button[type="submit"]').disabled = value;
    render();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(
      () => toast.classList.remove("show"), 3500
    );
  }

  function clearValidation() {
    formMessage.textContent = "";
    nameInput.removeAttribute("aria-invalid");
    urlInput.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;

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
      formMessage.textContent =
        "Please enter a valid HTTPS Surfline link.";
      urlInput.focus();
      return;
    }

    if (beaches.some(b => b.url.toLowerCase() === url.toLowerCase())) {
      urlInput.setAttribute("aria-invalid", "true");
      formMessage.textContent = "That Surfline link is already on your list.";
      urlInput.focus();
      return;
    }

    try {
      setBusy(true);
      await saveBeaches([...beaches, { name, url }]);
      form.reset();
      showToast(`${name} saved to your board!`);
    } catch (error) {
      showToast("Couldn't save beach: " + error.message);
    } finally {
      setBusy(false);
      render();
    }
  });

  nameInput.addEventListener("input", () =>
    nameInput.removeAttribute("aria-invalid")
  );
  urlInput.addEventListener("input", () =>
    urlInput.removeAttribute("aria-invalid")
  );

  loadBeaches();
})();
