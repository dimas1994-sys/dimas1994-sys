async function loadTemplates() {
  const list = document.getElementById("template-list");
  if (!list) return;

  const templates = await fetch("/api/workspace/templates").then(r => r.json());
  list.innerHTML = "";

  templates.forEach(t => {
    const div = document.createElement("div");
    div.className = "template";
    div.innerHTML = `<h3>${t.name}</h3><p>${t.description}</p><small>${t.includes.join(" • ")}</small>`;
    list.appendChild(div);
  });
}

async function loadResources() {
  const ul = document.getElementById("resource-list");
  if (!ul) return;

  const resources = await fetch("/api/workspace/resources").then(r => r.json());
  ul.innerHTML = "";

  resources.forEach(r => {
    const li = document.createElement("li");
    li.textContent = `${r.name} [${r.type}] ${r.path ? "— " + r.path : ""}`;
    ul.appendChild(li);
  });
}

async function loadNodes() {
  const board = document.getElementById("node-board");
  if (!board) return;

  const nodes = await fetch("/api/workspace/nodes").then(r => r.json());
  board.innerHTML = "";

  nodes.forEach(n => {
    const div = document.createElement("div");
    div.className = "node";
    div.innerHTML = `<strong>${n.title}</strong><br/><small>${n.category || "General"}</small>`;
    board.appendChild(div);
  });
}

function bindResourceForm() {
  const form = document.getElementById("resource-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    await fetch("/api/workspace/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        type: data.get("type"),
        path: data.get("path")
      })
    });

    form.reset();
    await loadResources();
  });
}

function bindNodeForm() {
  const form = document.getElementById("node-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    await fetch("/api/workspace/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        category: data.get("category")
      })
    });

    form.reset();
    await loadNodes();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindResourceForm();
  bindNodeForm();
  await Promise.all([loadTemplates(), loadResources(), loadNodes()]);
});
