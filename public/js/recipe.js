// public/js/recipe.js
// Recipe detail page — shows full info, instructions, and nutrition.

(function () {
  Auth.requireLogin();

  // Header user
  const user = Auth.getUser();
  if (user) {
    document.getElementById('username').textContent = user.username;
    document.getElementById('avatar').textContent = user.username[0].toUpperCase();
  }
  const logoutBtn = document.getElementById('logoutBtn');
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

  // Get recipe id from URL.
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const status = document.getElementById('status');
  const detail = document.getElementById('detail');

  if (!id) {
    status.innerHTML = '<div class="empty">No recipe specified.</div>';
    return;
  }

  load();

  async function load() {
    try {
      const result = await Api.getRecipe(id);

      let isFavorited = false;
      try {
        const favResult = await Api.getFavorites();
        const ids = new Set(favResult.data.favorites.map((f) => f.id));
        isFavorited = ids.has(parseInt(id, 10));
      } catch { /* favorites state is non-critical — recipe still renders */ }

      render(result.data.recipe, isFavorited);
    } catch (err) {
      status.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  function render(recipe, isFavorited) {
    document.title = `${recipe.title} — Mise`;

    document.getElementById('heroImg').src = recipe.image || '';
    document.getElementById('heroImg').alt = recipe.title;
    document.getElementById('title').textContent = recipe.title;
    document.getElementById('servings').textContent = recipe.servings || '—';
    document.getElementById('readyIn').textContent = recipe.readyInMinutes
      ? `${recipe.readyInMinutes} min` : '—';
    document.getElementById('healthScore').textContent = recipe.healthScore ?? '—';

    // Ingredients — compare against user's session ingredients to show have/missing
    let userIngredients = [];
    try {
      const raw = sessionStorage.getItem('mise_session');
      if (raw) userIngredients = JSON.parse(raw).ingredients || [];
    } catch {}

    const ingredientList = document.getElementById('ingredientList');
    ingredientList.innerHTML = '';

    let haveCount = 0;
    let missingCount = 0;

    (recipe.extendedIngredients || []).forEach((ing) => {
      const li = document.createElement('li');
      const ingName = (ing.name || '').toLowerCase();

      if (userIngredients.length > 0) {
        const have = userIngredients.some((u) => {
          const ul = u.toLowerCase();
          return ingName.includes(ul) || ul.includes(ingName);
        });
        li.className = have ? 'ing-have' : 'ing-missing';
        have ? haveCount++ : missingCount++;
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'ing-name';
      if (userIngredients.length > 0) {
        const dot = document.createElement('span');
        dot.className = 'ing-dot';
        nameSpan.appendChild(dot);
      }
      nameSpan.appendChild(document.createTextNode(ing.name || ing.original));

      const amount = document.createElement('span');
      amount.className = 'ingredient-amount';
      amount.textContent = ing.measures && ing.measures.us
        ? `${ing.measures.us.amount} ${ing.measures.us.unitShort || ''}`.trim()
        : (ing.original || '');

      li.appendChild(nameSpan);
      li.appendChild(amount);
      ingredientList.appendChild(li);
    });

    // Show have/missing summary above the list when user has session data
    if (userIngredients.length > 0) {
      const summary = document.createElement('p');
      summary.className = 'ing-summary';
      summary.innerHTML =
        `<span class="ing-summary-have">&#10003; ${haveCount} you have</span>` +
        ` &nbsp;·&nbsp; ` +
        `<span class="ing-summary-missing">&#10007; ${missingCount} to buy</span>`;
      ingredientList.before(summary);
    }

    // Instructions
    const instructionsEl = document.getElementById('instructions');
    if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
      const ol = document.createElement('ol');
      recipe.analyzedInstructions[0].steps.forEach((step) => {
        const li = document.createElement('li');
        li.textContent = step.step;
        ol.appendChild(li);
      });
      instructionsEl.innerHTML = '';
      instructionsEl.appendChild(ol);
    } else if (recipe.instructions) {
      // Fallback: raw HTML instructions from Spoonacular.
      instructionsEl.innerHTML = recipe.instructions;
    } else {
      instructionsEl.innerHTML = '<p style="color: var(--muted);">No instructions provided.</p>';
    }

    // Nutrition
    const nutritionGrid = document.getElementById('nutritionGrid');
    nutritionGrid.innerHTML = '';
    if (recipe.nutrition && recipe.nutrition.nutrients) {
      const wanted = ['Calories', 'Protein', 'Carbohydrates', 'Fat', 'Fiber', 'Sugar'];
      const nutrients = recipe.nutrition.nutrients.filter((n) =>
        wanted.includes(n.name)
      );
      nutrients.forEach((n) => {
        const cell = document.createElement('div');
        cell.className = 'nutrition-cell';
        const label = document.createElement('div');
        label.className = 'nutrition-cell-label';
        label.textContent = n.name;
        const value = document.createElement('div');
        value.className = 'nutrition-cell-value';
        value.textContent = `${Math.round(n.amount)}${n.unit}`;
        cell.appendChild(label);
        cell.appendChild(value);
        nutritionGrid.appendChild(cell);
      });
    }

    // Favorite button
    const favBtn = document.getElementById('favoriteBtn');
    let favorited = isFavorited;

    function updateFavBtn() {
      favBtn.innerHTML = favorited ? '&#9829; Saved' : '&#9825; Save recipe';
      favBtn.classList.toggle('favorited', favorited);
    }
    updateFavBtn();

    favBtn.addEventListener('click', async () => {
      favBtn.disabled = true;
      try {
        const res = await Api.toggleFavorite(recipe.id, recipe.title, recipe.image || '');
        favorited = res.data.isFavorited;
        updateFavBtn();
      } catch (err) {
        alert('Could not update favorites: ' + err.message);
      } finally {
        favBtn.disabled = false;
      }
    });

    status.style.display = 'none';
    detail.style.display = 'block';
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
})();
