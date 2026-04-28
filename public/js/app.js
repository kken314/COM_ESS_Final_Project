// public/js/app.js
// Main app page: image upload → ingredient detection → recipe search.

(function () {
  Auth.requireLogin();

  // ---------- Image resize helper ----------
  async function resizeImage(file, maxDimension = 1280, quality = 0.85) {
    if (file.type === 'image/heic' || file.type === 'image/heif') return file;
    if (file.size < 1024 * 1024) return file;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) { resolve(file); return; }

        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Failed to resize image'));
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image file')); };
      img.src = url;
    });
  }

  // ---------- Header / user ----------
  const user = Auth.getUser();
  if (user) {
    document.getElementById('username').textContent = user.username;
    document.getElementById('avatar').textContent = user.username[0].toUpperCase();
  }

  const logoutBtn     = document.getElementById('logoutBtn');
  const logoutPopover = document.getElementById('logoutPopover');

  logoutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    logoutPopover.classList.toggle('show');
  });
  document.getElementById('logoutConfirm').addEventListener('click', () => {
    Auth.clear();
    window.location.href = '/login.html';
  });
  document.getElementById('logoutCancel').addEventListener('click', () => {
    logoutPopover.classList.remove('show');
  });
  document.addEventListener('click', (e) => {
    if (!logoutPopover.contains(e.target) && e.target !== logoutBtn) {
      logoutPopover.classList.remove('show');
    }
  });

  // ---------- Element references ----------
  const filePick     = document.getElementById('filePick');
  const fileInput    = document.getElementById('imageInput');
  const imageTray    = document.getElementById('imageTray');
  const uploadActions = document.getElementById('uploadActions');
  const identifyBtn  = document.getElementById('identifyBtn');
  const resetBtn     = document.getElementById('resetBtn');

  const ingredientsSection = document.getElementById('ingredientsSection');
  const chips              = document.getElementById('chips');
  const ingredientCount    = document.getElementById('ingredientCount');
  const addInput           = document.getElementById('addInput');
  const addForm            = document.getElementById('addForm');
  const searchBtn          = document.getElementById('searchBtn');

  const recipesSection = document.getElementById('recipesSection');
  const recipeGrid     = document.getElementById('recipeGrid');
  const recipeStatus   = document.getElementById('recipeStatus');

  // ---------- State ----------
  const MAX_IMAGES = 3;
  let selectedFiles = []; // [{ file, previewUrl }]
  let ingredients   = [];
  let currentRecipes = [];

  // ---------- Session persistence ----------
  const SESSION_KEY = 'mise_session';

  function saveSession() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ingredients, recipes: currentRecipes }));
    } catch {}
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.ingredients && saved.ingredients.length) {
        ingredients = saved.ingredients;
        renderChips();
        ingredientsSection.classList.add('show');
      }
      if (saved.recipes && saved.recipes.length) {
        currentRecipes = saved.recipes;
        renderRecipes(currentRecipes);
        recipesSection.classList.add('show');
      }
    } catch {}
  }

  restoreSession();

  // ---------- File handling ----------
  function handleFiles(e) {
    const files = Array.from(e.target.files);
    const remaining = MAX_IMAGES - selectedFiles.length;
    const toAdd = files.slice(0, remaining);
    if (toAdd.length === 0) return;

    let loaded = 0;
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        selectedFiles.push({ file, previewUrl: ev.target.result });
        loaded++;
        if (loaded === toAdd.length) renderImageTray();
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ''; // allow re-selecting same file
  }

  fileInput.addEventListener('change', handleFiles);

  function renderImageTray() {
    imageTray.innerHTML = '';

    selectedFiles.forEach((item, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'img-thumb';

      const img = document.createElement('img');
      img.src = item.previewUrl;
      img.alt = `Photo ${idx + 1}`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'img-thumb-remove';
      removeBtn.setAttribute('aria-label', `Remove photo ${idx + 1}`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        selectedFiles.splice(idx, 1);
        renderImageTray();
      });

      thumb.appendChild(img);
      thumb.appendChild(removeBtn);
      imageTray.appendChild(thumb);
    });

    // "+" add-more tile — shown while under the limit
    if (selectedFiles.length < MAX_IMAGES) {
      const addLabel = document.createElement('label');
      addLabel.className = 'img-thumb img-thumb-add';
      addLabel.title = `Add photo (${MAX_IMAGES - selectedFiles.length} left)`;

      const plus = document.createElement('span');
      plus.textContent = '+';
      addLabel.appendChild(plus);

      const addMoreInput = document.createElement('input');
      addMoreInput.type = 'file';
      addMoreInput.accept = 'image/jpeg,image/png,image/webp,image/heic';
      addMoreInput.multiple = true;
      addMoreInput.addEventListener('change', handleFiles);
      addLabel.appendChild(addMoreInput);

      imageTray.appendChild(addLabel);
    }

    const hasFiles = selectedFiles.length > 0;
    filePick.style.display        = hasFiles ? 'none' : '';
    imageTray.style.display       = hasFiles ? 'flex' : 'none';
    uploadActions.style.display   = hasFiles ? 'flex' : 'none';
  }

  // ---------- Reset ----------
  resetBtn.addEventListener('click', () => {
    selectedFiles  = [];
    ingredients    = [];
    currentRecipes = [];
    renderImageTray();
    chips.innerHTML = '';
    ingredientsSection.classList.remove('show');
    recipesSection.classList.remove('show');
    recipeGrid.innerHTML = '';
    sessionStorage.removeItem(SESSION_KEY);
  });

  // ---------- Identify ingredients via Gemini ----------
  identifyBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    identifyBtn.disabled = true;
    const originalText = identifyBtn.textContent;
    const count = selectedFiles.length;
    const spinnerHtml = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>';
    identifyBtn.innerHTML = `${spinnerHtml} Analyzing ${count} photo${count > 1 ? 's' : ''}…`;

    try {
      identifyBtn.innerHTML = `${spinnerHtml} Preparing ${count} photo${count > 1 ? 's' : ''}…`;
      const filesToUpload = await Promise.all(selectedFiles.map(({ file }) => resizeImage(file)));

      identifyBtn.innerHTML = `${spinnerHtml} Analyzing…`;
      const result = await Api.identifyIngredients(filesToUpload);
      ingredients = result.data.ingredients;

      if (ingredients.length === 0) {
        alert('No ingredients detected. Try clearer photos of your food.');
      } else {
        renderChips();
        ingredientsSection.classList.add('show');
        ingredientsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      alert('Could not identify ingredients: ' + err.message);
    } finally {
      identifyBtn.disabled = false;
      identifyBtn.textContent = originalText;
    }
  });

  // ---------- Ingredient chips ----------
  function renderChips() {
    chips.innerHTML = '';
    ingredients.forEach((ingredient, idx) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `
        <span></span>
        <button type="button" class="chip-x" aria-label="Remove ${ingredient}">×</button>
      `;
      chip.querySelector('span').textContent = ingredient;
      chip.querySelector('.chip-x').addEventListener('click', () => {
        ingredients.splice(idx, 1);
        renderChips();
      });
      chips.appendChild(chip);
    });

    ingredientCount.textContent =
      ingredients.length === 1 ? '1 ingredient' : `${ingredients.length} ingredients`;
    searchBtn.disabled = ingredients.length === 0;
    saveSession();
  }

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = addInput.value.trim().toLowerCase();
    if (!value) return;
    if (ingredients.includes(value)) { addInput.value = ''; return; }
    ingredients.push(value);
    renderChips();
    addInput.value = '';
  });

  // ---------- Search recipes via Spoonacular ----------
  searchBtn.addEventListener('click', async () => {
    if (ingredients.length === 0) return;

    recipesSection.classList.add('show');
    recipeGrid.innerHTML = '';
    recipeStatus.innerHTML = '<div class="spinner"></div><div>Finding recipes…</div>';
    recipeStatus.style.display = 'block';
    recipesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const result = await Api.searchRecipes(ingredients);
      currentRecipes = result.data.recipes;
      recipeStatus.style.display = 'none';

      if (!currentRecipes || currentRecipes.length === 0) {
        recipeStatus.innerHTML = '<div class="empty">No matching recipes found. Try adding more ingredients.</div>';
        recipeStatus.style.display = 'block';
        return;
      }

      saveSession();
      renderRecipes(currentRecipes);
    } catch (err) {
      recipeStatus.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  });

  function renderRecipes(recipes) {
    recipeGrid.innerHTML = '';
    recipes.forEach((r) => {
      const card = document.createElement('article');
      card.className = 'recipe-card';
      card.innerHTML = `
        <img class="recipe-card-img" alt="" />
        <div class="recipe-card-body">
          <h3 class="recipe-card-title"></h3>
          <div class="recipe-card-meta">
            <span><strong>${r.usedIngredientCount}</strong> you have</span>
            <span><strong>${r.missedIngredientCount}</strong> missing</span>
          </div>
        </div>
      `;
      card.querySelector('img').src = r.image || '';
      card.querySelector('img').alt = r.title;
      card.querySelector('h3').textContent = r.title;
      card.addEventListener('click', () => {
        window.location.href = `/recipe.html?id=${r.id}`;
      });
      recipeGrid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
})();
