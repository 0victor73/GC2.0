document.addEventListener('DOMContentLoaded', () => {
  // Inicializar Lucide Icons
  lucide.createIcons();

  /* ── VARIÁVEIS PRINCIPAIS ── */
  const channel = new BroadcastChannel('gc-control');
  let isShowing = false;
  let gcReady = false; // Indica se um GC foi carregado na exibição

  // Escutar mensagens de auto_hide (quando o GC sai automaticamente pelo timer)
  channel.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.action === 'auto_hide') {
      isShowing = false;
      switchGc.checked = false;
    }
  });
  
  // Elementos UI
  const inputNome = document.getElementById('input-nome');
  const inputDescricao = document.getElementById('input-descricao');
  const switchGc = document.getElementById('painel-switchlowerthird');
  const configDuration = document.getElementById('config-duration');

  /* ── TRANSMISSÃO (BROADCAST) ── */
  
  // Envia atualização em tempo real se estiver visível
  function updateIfVisible() {
    if (isShowing) {
      channel.postMessage({
        action: 'update',
        data: { nome: inputNome.value, descricao: inputDescricao.value }
      });
    }
  }

  inputNome.addEventListener('input', updateIfVisible);
  inputDescricao.addEventListener('input', updateIfVisible);

  // Switch de Mostrar/Esconder
  switchGc.addEventListener('change', (e) => {
    if (e.target.checked && !gcReady) {
      e.target.checked = false;
      isShowing = false;
      alert('Nenhum GC carregado. Importe um pacote .gc nas Configurações antes de transmitir.');
      return;
    }

    isShowing = e.target.checked;
    if (isShowing) {
      const dur = parseInt(configDuration.value) || 0;
      channel.postMessage({
        action: 'show',
        data: {
          nome: inputNome.value,
          descricao: inputDescricao.value,
          duration: dur
        }
      });
    } else {
      channel.postMessage({ action: 'hide' });
    }
  });

  /* ── BANCO DE DADOS (LOCALSTORAGE) ── */
  const buscaDb = document.getElementById('busca-db');
  const dbContainer = document.getElementById('db-container-oculto');
  const novoNome = document.getElementById('novo-nome-db');
  const novoInfo = document.getElementById('novo-info-db');
  const btnSalvarDb = document.getElementById('btn-salvar-db');
  const listaDb = document.getElementById('lista-db');

  let db = JSON.parse(localStorage.getItem('gc2_db')) || [];

  function renderDb(filter = '') {
    listaDb.innerHTML = '';
    const filtered = db.filter(item => 
      item.nome.toLowerCase().includes(filter.toLowerCase()) || 
      item.descricao.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'db-item';
      el.innerHTML = `
        <div class="db-item-content">
          <span class="db-nome">${item.nome}</span>
          <span class="db-desc">${item.descricao}</span>
        </div>
        <button class="db-btn-del" data-index="${index}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      `;

      el.querySelector('.db-item-content').addEventListener('click', () => {
        inputNome.value = item.nome;
        inputDescricao.value = item.descricao;
        inputNome.dispatchEvent(new Event('input'));
        inputDescricao.dispatchEvent(new Event('input'));
      });

      // Deletar
      el.querySelector('.db-btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        db.splice(index, 1);
        saveDb();
        renderDb(buscaDb.value);
      });

      listaDb.appendChild(el);
    });
    lucide.createIcons();
  }

  function saveDb() {
    localStorage.setItem('gc2_db', JSON.stringify(db));
  }

  // Mostrar painel oculto ao focar na busca
  buscaDb.addEventListener('focus', () => dbContainer.classList.remove('hidden'));
  buscaDb.addEventListener('input', (e) => renderDb(e.target.value));

  btnSalvarDb.addEventListener('click', () => {
    if (novoNome.value.trim() === '') return;
    db.push({ nome: novoNome.value.trim(), descricao: novoInfo.value.trim() });
    saveDb();
    renderDb(buscaDb.value);
    novoNome.value = ''; novoInfo.value = '';
  });

  renderDb();

  /* ── SLOTS (1 a 8) ── */
  const slots = {};
  for (let i = 1; i <= 8; i++) {
    const raw = localStorage.getItem(`gc2_slot_${i}`);
    slots[i] = raw ? JSON.parse(raw) : { nome: '', descricao: '' };
  }
  
  const botoesSlots = document.querySelectorAll('.botao-salvo');
  let activeSlot = null;

  function updateButtonTitles() {
    botoesSlots.forEach(b => {
      const slot = b.getAttribute('data-slot');
      const data = slots[slot];
      b.title = data && data.nome ? data.nome : 'Vazio';
    });
  }

  function setActiveSlot(slotId) {
    activeSlot = slotId;
    botoesSlots.forEach(b => b.classList.toggle('active', b.getAttribute('data-slot') === String(activeSlot)));
    
    inputNome.value = slots[activeSlot].nome || '';
    inputDescricao.value = slots[activeSlot].descricao || '';
    
    localStorage.setItem('gc2_active_slot', activeSlot);
    updateIfVisible();
    updateButtonTitles();
  }

  botoesSlots.forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveSlot(btn.getAttribute('data-slot'));
    });
  });

  function updateActiveSlot() {
    if (!activeSlot) return;
    slots[activeSlot].nome = inputNome.value;
    slots[activeSlot].descricao = inputDescricao.value;
    localStorage.setItem(`gc2_slot_${activeSlot}`, JSON.stringify(slots[activeSlot]));
    updateButtonTitles();
  }

  inputNome.addEventListener('input', updateActiveSlot);
  inputDescricao.addEventListener('input', updateActiveSlot);
  
  updateButtonTitles();
  const persistedActive = localStorage.getItem('gc2_active_slot');
  if (persistedActive && slots[persistedActive]) {
    setActiveSlot(persistedActive);
  }

  /* ── NOTAS ── */
  const notes = document.getElementById('notes');
  notes.value = localStorage.getItem('gc2_notes') || '';
  notes.addEventListener('input', () => localStorage.setItem('gc2_notes', notes.value));


  /* ── MODAL CONFIGURAÇÕES E GERENCIAMENTO DE GC ── */
  const modalConfig = document.getElementById('modal-config');
  const btnOpenConfig = document.getElementById('btn-open-config');
  const btnCloseConfig = document.getElementById('btn-close-config');
  
  // Duração Global
  const savedDuration = localStorage.getItem('gc2_duration');
  if (savedDuration !== null) configDuration.value = savedDuration;
  configDuration.addEventListener('change', () => localStorage.setItem('gc2_duration', configDuration.value));

  btnOpenConfig.addEventListener('click', () => modalConfig.classList.remove('hidden'));
  btnCloseConfig.addEventListener('click', () => modalConfig.classList.add('hidden'));

  // Gerenciamento de GCs importados no LocalStorage
  let gcs = JSON.parse(localStorage.getItem('gc2_list')) || [];
  // Limpar GCs antigos sem conteúdo (ex: 'padrao' legado)
  const originalLen = gcs.length;
  gcs = gcs.filter(gc => gc.html && gc.css && gc.js);
  if (gcs.length !== originalLen) {
    localStorage.setItem('gc2_list', JSON.stringify(gcs));
  }
  
  const gcSelect = document.getElementById('gc-select');
  const listGcs = document.getElementById('lista-gcs-gerenciar');
  const btnImport = document.getElementById('btn-import-gc');
  const fileImport = document.getElementById('file-import-gc');

  function renderGcList() {
    // Atualizar dropdown
    const placeholderText = gcs.length === 0 ? 'Nenhum GC importado' : 'Selecione um pacote';
    gcSelect.innerHTML = `<option value="" disabled>${placeholderText}</option>`;
    gcs.forEach(gc => {
      gcSelect.innerHTML += `<option value="${gc.id}">${gc.nome}</option>`;
    });
    const activeGc = localStorage.getItem('gc2_active') || '';
    if (activeGc) gcSelect.value = activeGc;

    // Atualizar lista da modal
    listGcs.innerHTML = '';
    gcs.forEach((gc, index) => {
      const el = document.createElement('div');
      el.className = `gc-list-item ${gc.id === activeGc ? 'active' : ''}`;
      el.innerHTML = `
        <span>${gc.nome}</span>
        <div class="gc-actions">
          <button class="btn-up" data-index="${index}"><i data-lucide="arrow-up" class="w-3.5 h-3.5"></i></button>
          <button class="btn-down" data-index="${index}"><i data-lucide="arrow-down" class="w-3.5 h-3.5"></i></button>
          <button class="text-red-400 btn-del-gc" data-index="${index}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      `;
      listGcs.appendChild(el);
    });
    lucide.createIcons();
    bindGcActions();
  }

  function bindGcActions() {
    document.querySelectorAll('.btn-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(btn.getAttribute('data-index'));
        if (i > 0) {
          [gcs[i-1], gcs[i]] = [gcs[i], gcs[i-1]];
          saveGcs();
        }
      });
    });
    document.querySelectorAll('.btn-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(btn.getAttribute('data-index'));
        if (i < gcs.length - 1) {
          [gcs[i], gcs[i+1]] = [gcs[i+1], gcs[i]];
          saveGcs();
        }
      });
    });
    document.querySelectorAll('.btn-del-gc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(btn.getAttribute('data-index'));
        const deletedGc = gcs[i];
        gcs.splice(i, 1);
        // Se deletou o GC ativo, resetar
        const activeId = localStorage.getItem('gc2_active');
        if (deletedGc && deletedGc.id === activeId) {
          localStorage.removeItem('gc2_active');
          gcReady = false;
        }
        saveGcs();
      });
    });
  }

  function saveGcs() {
    localStorage.setItem('gc2_list', JSON.stringify(gcs));
    renderGcList();
  }

  function broadcastActiveGc() {
    const activeId = localStorage.getItem('gc2_active');
    const activeGc = gcs.find(g => g.id === activeId);
    if (activeGc && activeGc.html) {
      channel.postMessage({
        action: 'load_gc',
        data: { html: activeGc.html, css: activeGc.css, js: activeGc.js }
      });
      gcReady = true;
    } else {
      gcReady = false;
    }
  }

  gcSelect.addEventListener('change', (e) => {
    localStorage.setItem('gc2_active', e.target.value);
    renderGcList();
    broadcastActiveGc();
  });

  // Import real zip (.gc)
  btnImport.addEventListener('click', () => fileImport.click());
  fileImport.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const newId = 'gc_' + Date.now();
      
      try {
        const zip = await JSZip.loadAsync(file);
        
        let html = await zip.file('index.html').async('string');
        const css = await zip.file('style.css').async('string');
        const js = await zip.file('script.js').async('string');
        
        // Convert assets
        const assetsFolder = zip.folder('assets');
        if (assetsFolder) {
          const files = Object.keys(zip.files).filter(k => k.startsWith('assets/') && !zip.files[k].dir);
          for (const assetPath of files) {
            const base64 = await zip.file(assetPath).async('base64');
            const ext = assetPath.split('.').pop().toLowerCase();
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataUrl = `data:${mime};base64,${base64}`;
            
            // Replace all occurrences of the relative path in HTML
            html = html.split(assetPath).join(dataUrl);
          }
        }
        
        gcs.push({ id: newId, nome: file.name.replace('.gc', '').replace('.zip', ''), html, css, js });
        saveGcs();
        fileImport.value = '';
        
        // Auto select
        gcSelect.value = newId;
        gcSelect.dispatchEvent(new Event('change'));
        
      } catch (err) {
        console.error(err);
        alert('Erro ao importar pacote .gc. Certifique-se que o arquivo é válido.');
      }
    }
  });

  renderGcList();
  
  // Enviar o GC atual logo que o painel carrega (dá um pequeno delay para a exibicao.html estar pronta)
  setTimeout(broadcastActiveGc, 500);
});
