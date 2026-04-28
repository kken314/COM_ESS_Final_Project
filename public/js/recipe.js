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
      render(result.data.recipe);
    } catch (err) {
      status.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  function render(recipe) {
    document.title = `${recipe.title} — Mise`;

    document.getElementById('heroImg').src = recipe.image || '';
    document.getElementById('heroImg').alt = recipe.title;
    document.getElementById('title').textContent = recipe.title;
    document.getElementById('servings').textContent = recipe.servings || '—';
    document.getElementById('readyIn').textContent = recipe.readyInMinutes
      ? `${recipe.readyInMinutes} min` : '—';
    document.getElementById('healthScore').textContent = recipe.healthScore ?? '—';

    // Ingredients
    const ingredientList = document.getElementById('ingredientList');
    ingredientList.innerHTML = '';
    (recipe.extendedIngredients || []).forEach((ing) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = ing.name || ing.original;
      const amount = document.createElement('span');
      amount.className = 'ingredient-amount';
      amount.textContent = ing.measures && ing.measures.us
        ? `${ing.measures.us.amount} ${ing.measures.us.unitShort || ''}`.trim()
        : (ing.original || '');
      li.appendChild(name);
      li.appendChild(amount);
      ingredientList.appendChild(li);
    });

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

    status.style.display = 'none';
    detail.style.display = 'block';
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
})();
