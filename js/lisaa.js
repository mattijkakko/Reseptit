document.addEventListener('DOMContentLoaded', () => {
  const editId = new URLSearchParams(location.search).get('id');
  let imageBase64 = null;

  // ── API key ──────────────────────────────────────────────────────────
  const apiKeyToggle = document.getElementById('api-key-toggle');
  const apiKeyForm   = document.getElementById('api-key-form');
  const apiKeyInput  = document.getElementById('api-key-input');
  apiKeyInput.value  = getApiKey();

  apiKeyToggle.addEventListener('click', () => apiKeyForm.classList.toggle('open'));
  apiKeyInput.addEventListener('change', () => setApiKey(apiKeyInput.value.trim()));

  // ── Image upload ─────────────────────────────────────────────────────
  const uploadArea    = document.getElementById('upload-area');
  const fileInput     = document.getElementById('file-input');
  const previewImg    = document.getElementById('upload-preview');
  const analyzeBtn    = document.getElementById('btn-analyze');

  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) loadFile(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
  });

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      imageBase64 = dataUrl.split(',')[1];
      previewImg.src = dataUrl;
      previewImg.style.display = 'block';
      analyzeBtn.disabled = false;
      document.getElementById('upload-hint').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  analyzeBtn.addEventListener('click', analyzeImage);

  async function analyzeImage() {
    const key = getApiKey();
    if (!key) { toast('Anna ensin Anthropic API-avain ylhäällä.'); apiKeyForm.classList.add('open'); return; }
    if (!imageBase64) { toast('Valitse ensin kuva.'); return; }

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> Analysoidaan…';

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: EXTRACT_PROMPT }
            ]
          }]
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const text = data.content?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Vastauksessa ei ollut JSON-dataa.');
      const parsed = JSON.parse(match[0]);
      populateForm(parsed);
      toast('Resepti poimittu kuvasta!');
    } catch (e) {
      console.error(e);
      toast('Virhe: ' + e.message);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analysoi kuva';
    }
  }

  const EXTRACT_PROMPT = `Analysoi tämä reseptikuvakaappaus ja palauta reseptin tiedot AINOASTAAN seuraavan JSON-rakenteen mukaisesti. Älä lisää mitään muuta tekstiä vastauksen ympärille.

{
  "title": "reseptin nimi",
  "servings": 4,
  "servingsUnit": "annosta",
  "sections": [
    {
      "name": "osion otsikko tai tyhjä merkkijono",
      "ingredients": [
        { "amount": "400", "unit": "g", "name": "maustamattomia broilerinsuikaleita" }
      ]
    }
  ],
  "instructions": ["Vaihe 1 teksti.", "Vaihe 2 teksti."],
  "notes": "vinkit tai tyhjä merkkijono jos ei vinkkejä",
  "tags": ["pasta", "kana", "arkiruoka"]
}

Tärkeää:
- amount on aina merkkijono (esim. "½", "2-3", "400")
- Jos reseptissä ei ole osioita, käytä yhtä osiota tyhjällä nimellä
- tags: ehdota 2-4 kuvaavaa kategoriaa suomeksi`;

  // ── Form population ──────────────────────────────────────────────────
  function populateForm(r) {
    document.getElementById('title').value = r.title || '';
    document.getElementById('servings').value = r.servings || '';
    document.getElementById('servings-unit').value = r.servingsUnit || 'annosta';

    const sectionsEl = document.getElementById('ing-sections');
    sectionsEl.innerHTML = '';
    for (const s of (r.sections || [])) addSection(s);

    const stepsEl = document.getElementById('steps');
    stepsEl.innerHTML = '';
    for (const step of (r.instructions || [])) addStep(step);

    document.getElementById('notes').value = r.notes || '';
    setTags(r.tags || []);
  }

  // ── Load existing recipe for editing ─────────────────────────────────
  if (editId) {
    const existing = getRecipe(editId);
    if (existing) {
      document.getElementById('page-title').textContent = 'Muokkaa reseptiä';
      populateForm(existing);
    }
  } else {
    addSection({ name: '', ingredients: [{}] });
    addStep('');
  }

  // ── Ingredient sections ───────────────────────────────────────────────
  document.getElementById('add-section-btn').addEventListener('click', () => addSection({ name: '', ingredients: [{}] }));

  function addSection(data = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'ing-section form-card';
    wrap.innerHTML = `
      <div class="ing-section-header">
        <input type="text" placeholder="Osion nimi (esim. Kastike) – jätä tyhjäksi jos ei osiota" value="${esc(data.name || '')}">
        <button class="remove-btn" title="Poista osio">×</button>
      </div>
      <div class="ing-rows"></div>
      <button class="add-btn add-ing-btn">+ Lisää ainesosa</button>
    `;
    wrap.querySelector('.remove-btn').addEventListener('click', () => {
      if (document.querySelectorAll('.ing-section').length > 1) wrap.remove();
      else toast('Vähintään yksi osio tarvitaan.');
    });
    wrap.querySelector('.add-ing-btn').addEventListener('click', () => addIngRow(wrap.querySelector('.ing-rows'), {}));

    const rowsEl = wrap.querySelector('.ing-rows');
    for (const ing of (data.ingredients?.length ? data.ingredients : [{}])) addIngRow(rowsEl, ing);

    document.getElementById('ing-sections').appendChild(wrap);
  }

  function addIngRow(container, ing = {}) {
    const row = document.createElement('div');
    row.className = 'ing-row';
    row.innerHTML = `
      <input type="text" placeholder="Määrä" value="${esc(ing.amount || '')}" data-field="amount">
      <input type="text" placeholder="Yksikkö" value="${esc(ing.unit || '')}" data-field="unit">
      <input type="text" placeholder="Ainesosa" value="${esc(ing.name || '')}" data-field="name">
      <button class="remove-btn" title="Poista">×</button>
    `;
    row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  // ── Instructions ──────────────────────────────────────────────────────
  document.getElementById('add-step-btn').addEventListener('click', () => addStep(''));

  function addStep(text = '') {
    const stepsEl = document.getElementById('steps');
    const idx = stepsEl.children.length + 1;
    const row = document.createElement('div');
    row.className = 'step-row';
    row.innerHTML = `
      <div class="step-num">${idx}</div>
      <textarea placeholder="Vaihe ${idx}">${esc(text)}</textarea>
      <button class="remove-btn" title="Poista">×</button>
    `;
    row.querySelector('.remove-btn').addEventListener('click', () => {
      row.remove();
      renumberSteps();
    });
    stepsEl.appendChild(row);
  }

  function renumberSteps() {
    document.querySelectorAll('#steps .step-row').forEach((row, i) => {
      row.querySelector('.step-num').textContent = i + 1;
      row.querySelector('textarea').placeholder = `Vaihe ${i + 1}`;
    });
  }

  // ── Tags ──────────────────────────────────────────────────────────────
  let tags = [];

  function setTags(list) {
    tags = [...list];
    renderTags();
  }

  function renderTags() {
    const wrap = document.getElementById('tags-wrap');
    const input = document.getElementById('tags-input');
    wrap.querySelectorAll('.tag').forEach(el => el.remove());
    for (const t of tags) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.innerHTML = `${esc(t)}<button title="Poista">×</button>`;
      span.querySelector('button').addEventListener('click', () => {
        tags = tags.filter(x => x !== t);
        renderTags();
      });
      wrap.insertBefore(span, input);
    }
  }

  document.getElementById('tags-input').addEventListener('keydown', e => {
    const input = e.target;
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      const val = input.value.trim().replace(/,+$/, '');
      if (val && !tags.includes(val)) { tags.push(val); renderTags(); }
      input.value = '';
    }
    if (e.key === 'Backspace' && !input.value && tags.length) {
      tags.pop();
      renderTags();
    }
  });
  document.getElementById('tags-wrap').addEventListener('click', () => document.getElementById('tags-input').focus());

  // ── Save ──────────────────────────────────────────────────────────────
  document.getElementById('btn-save').addEventListener('click', saveRecipe);
  document.getElementById('btn-cancel').addEventListener('click', () => history.back());

  function saveRecipe() {
    const title = document.getElementById('title').value.trim();
    if (!title) { toast('Anna reseptille nimi.'); document.getElementById('title').focus(); return; }

    const sections = [];
    for (const sectionEl of document.querySelectorAll('.ing-section')) {
      const name = sectionEl.querySelector('.ing-section-header input').value.trim();
      const ingredients = [];
      for (const row of sectionEl.querySelectorAll('.ing-row')) {
        const name2 = row.querySelector('[data-field=name]').value.trim();
        if (!name2) continue;
        ingredients.push({
          amount: row.querySelector('[data-field=amount]').value.trim(),
          unit:   row.querySelector('[data-field=unit]').value.trim(),
          name:   name2,
        });
      }
      if (ingredients.length) sections.push({ name, ingredients });
    }

    const instructions = [];
    for (const row of document.querySelectorAll('#steps .step-row')) {
      const text = row.querySelector('textarea').value.trim();
      if (text) instructions.push(text);
    }

    const servings = parseInt(document.getElementById('servings').value) || null;
    const servingsUnit = document.getElementById('servings-unit').value.trim() || 'annosta';

    const recipe = {
      id: editId || generateId(),
      title,
      servings,
      servingsUnit,
      sections,
      instructions,
      notes: document.getElementById('notes').value.trim(),
      tags: [...tags],
      createdAt: editId ? getRecipe(editId)?.createdAt : new Date().toISOString(),
    };

    upsertRecipe(recipe);
    location.href = `resepti.html?id=${recipe.id}`;
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }
});

function toast(msg, duration = 3000) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}
